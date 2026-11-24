import { settings } from "../config/environment.ts";
import { HttpClient } from "./HttpClient.ts";
import { v3Headers } from "./v3Auth.ts";

/** Activities store `incoming` / `outgoing`, or the legacy `1` / `2`. */
export function emailDirection(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "1" || raw === "incoming") return "incoming";
  if (raw === "2" || raw === "outgoing") return "outgoing";
  return raw;
}

/** Mailgun fields `Client::Mails::MailgunController#incoming_mail` copies onto IncomingMailLog. */
export interface IncomingEmail {
  /** Campaign mailbox from `data_provider_medium_values`. Routing treats it as the lead medium. */
  recipient: string;
  /** New lead's email. Also sent as `sender`. */
  fromEmail: string;
  /** `First Last`. The observer splits this into first and last name. */
  fromName: string;
  subject: string;
  /** Plain sentence. Sent as `body-html` and `body-plain`. */
  body: string;
  /** Stored on the email as `toCC`. Reply all copies this; Reply leaves CC empty. */
  cc?: string;
}

/**
 * Lead email. Incoming mail is the Mailgun webhook the CRM Playwright suite posts.
 * Sending is the same call the app makes from Send email.
 */
export class EmailsApi {
  private readonly http = new HttpClient(settings.apiBaseUrl);
  private readonly v3 = new HttpClient(settings.v3ApiBaseUrl);

  /**
   * `POST /client/:client_id/mails/mailgun/incoming_mail` (Client::Mails::MailgunController#incoming_mail).
   * No API key: Mailgun posts the form, and the action answers `ok` even when the save is skipped.
   * The observer creates a lead only when `attachment-count` is present (including `0`), the sender
   * is not an existing lead, and `from` is `Name <email>`.
   * Call `LeadsApi.retrieveWhenExists` on `fromEmail` to confirm the lead was stored.
   */
  async receive(email: IncomingEmail): Promise<void> {
    const mailbox = email.recipient.trim();
    const fromEmail = email.fromEmail.trim().toLowerCase();
    const stamp = Math.floor(Date.now() / 1000);
    const { body } = await this.http.post<string>(
      `/client/${settings.credentials.clientId}/mails/mailgun/incoming_mail`,
      {
        form: {
          recipient: mailbox,
          sender: fromEmail,
          from: `${email.fromName.trim()} <${fromEmail}>`,
          To: mailbox,
          subject: email.subject,
          "body-html": `<div>${email.body}</div>`,
          "body-plain": email.body,
          ...(email.cc ? { Cc: email.cc } : {}),
          Date: new Date(stamp * 1000).toUTCString(),
          "Message-Id": `<appium.${stamp}.${fromEmail}>`,
          timestamp: String(stamp),
          token: `appium${stamp}`,
          "attachment-count": "0",
        },
      },
    );
    if (!String(body).toLowerCase().includes("ok")) {
      throw new Error(`Incoming mail was not accepted: ${String(body).slice(0, 200)}`);
    }
  }

  /**
   * `GET /client/leads/:lead_id/emails/:id` (Client::Leads::EmailsController#show).
   * The HTML page is the stored subject and body. Activities JSON omits `html_content`.
   */
  /**
   * `GET /api/v3/client/leads/:id/emails/:email_id` (EmailsController#show).
   * Returns subject, fromaddr, toaddr, toCC, toBCC, and direction.
   * The activities feed leaves `toaddr` empty.
   */
  async message(leadId: string, emailId: string, accessToken: string): Promise<Record<string, unknown>> {
    const { body } = await this.v3.get<unknown>(`/api/v3/client/leads/${leadId}/emails/${emailId}`, {
      headers: v3Headers(accessToken),
    });
    const record = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
    const nested = record.email;
    return nested && typeof nested === "object" && !Array.isArray(nested) ? (nested as Record<string, unknown>) : record;
  }

  async page(leadId: string, emailId: string): Promise<string> {
    const { body } = await this.http.get<string>(`/client/leads/${leadId}/emails/${emailId}`, {
      query: {
        api_key: settings.credentials.fullAccessApiKey,
        client_id: settings.credentials.clientId,
      },
      headers: { Accept: "text/html" },
      asText: true,
    });
    return body;
  }

  /**
   * One editable general-email template whose subject has no merge field and whose
   * body has a sentence the sent page can be checked against.
   * `GET /api/v3/client/leads/:id/activity_lookups?type=email_templates`
   * then `type=email_template&template_id=`.
   */
  async usableTemplate(leadId: string, accessToken: string): Promise<EmailTemplate> {
    const listed = await this.lookupRows(leadId, accessToken, { type: "email_templates" });
    const tried: string[] = [];
    for (const row of listed.slice(0, 8)) {
      const id = text(row.value) || text(row.id);
      const name = text(row.label) || text(row.name) || text(row.text);
      if (!id || !name) continue;
      tried.push(name);
      const [detail] = await this.lookupRows(leadId, accessToken, { type: "email_template", template_id: id });
      if (!detail) continue;
      const subject = text(detail.subject);
      const phrase = plainPhrase(text(detail.content));
      if (subject.length < 3 || subject.includes("{{") || phrase.length < 12) continue;
      return { id, name, subject, phrase };
    }
    throw new Error(`No email template with a plain subject and sentence. Looked at: ${tried.join(", ") || "none"}`);
  }

  private async lookupRows(leadId: string, accessToken: string, query: Record<string, string>): Promise<Record<string, unknown>[]> {
    const { body } = await this.v3.get<unknown>(`/api/v3/client/leads/${leadId}/activity_lookups`, {
      headers: v3Headers(accessToken),
      query,
    });
    return rowsOf(body);
  }
}

/** A general email template the Send email picker can apply. */
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  /** Words from the template body, with tags and merge fields removed. */
  phrase: string;
}

/** One activity field. Address lists are joined so a spec can search them. */
export function emailField(fields: Record<string, unknown>, key: string): string {
  const value = fields[key];
  if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ");
  return value == null ? "" : String(value).trim();
}

function text(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function rowsOf(body: unknown): Record<string, unknown>[] {
  const record = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const list = Array.isArray(body) ? body : record.results ?? record.data;
  if (!Array.isArray(list)) return [];
  return list.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item));
}

/**
 * Words that sit between merge fields. Rendering replaces `{{...}}` and would
 * split a phrase that used to lie on either side of one.
 */
function plainPhrase(html: string): string {
  const chunks = html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").split(/\{\{[^}]*\}\}/);
  for (const chunk of chunks) {
    const words = chunk
      .replace(/&[a-z]+;/gi, " ")
      .split(/\s+/)
      .filter((word) => /[a-zA-Z]{4,}/.test(word));
    if (words.length >= 3) return words.slice(0, 4).join(" ");
  }
  return "";
}
