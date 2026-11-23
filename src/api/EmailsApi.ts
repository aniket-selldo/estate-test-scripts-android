import { settings } from "../config/environment.ts";
import { HttpClient } from "./HttpClient.ts";

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
}

/**
 * Lead email. Incoming mail is the Mailgun webhook the CRM Playwright suite posts.
 * Sending is the same call the app makes from Send email.
 */
export class EmailsApi {
  private readonly http = new HttpClient(settings.apiBaseUrl);

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
}
