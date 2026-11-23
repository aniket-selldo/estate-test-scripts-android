import { settings } from "../config/environment.ts";
import { HttpClient } from "./HttpClient.ts";

export interface FollowupChoice {
  id: string;
  text: string;
}

export interface FollowupCustomField {
  name: string;
  label: string;
  type: string;
}

/** What `GET /api/v3/client/leads/:id/followups/new` offers this lead. */
export interface FollowupForm {
  type: FollowupChoice;
  timeZone: string;
  requiredFields: FollowupCustomField[];
  cancellationReasons: FollowupChoice[];
}

export interface ScheduleFollowupInput {
  typeId: string;
  /** UTC `yyyy-MM-dd HH:mm`. */
  scheduledOn: string;
  subject: string;
  agenda: string;
}

export interface FollowupRecord {
  id: string;
  status: string;
  scheduledOn: string;
  followupType: string;
  subject: string;
  agenda: string;
  cancellationReason: string;
  cancellationNote: string;
}

interface ActivityRow {
  followup?: {
    _id?: string;
    status?: string;
    scheduled_on?: string;
    followup_type?: string;
    subject?: string;
    agenda?: string;
    cancellation_reason?: string;
    cancellation_note?: string;
  };
}

interface FollowupFormBody {
  defaults?: { time_zone?: string; followup_type?: string };
  options?: {
    followup_types?: { value?: string; label?: string }[];
    cancellation_reasons?: { value?: string; label?: string }[];
  };
  custom_fields?: { name?: string; label?: string; type?: string; required?: boolean }[];
}

/**
 * Follow-ups the way the app does them: v3 JSON with the signed-in user's JWT
 * (`client/leads/followups#create`, `client/followup_statuses#update`).
 * Reading them back uses the full-access key on the legacy activities feed.
 */
export class FollowupsApi {
  private readonly v3 = new HttpClient(settings.v3ApiBaseUrl);
  private readonly legacy = new HttpClient(settings.apiBaseUrl);

  constructor(private readonly accessToken = "") {}

  /** `GET /api/v3/client/leads/:id/followups/new`. */
  async screen(leadId: string): Promise<FollowupForm> {
    const { body } = await this.v3.get<FollowupFormBody>(`/api/v3/client/leads/${leadId}/followups/new`, {
      headers: this.authHeaders(),
    });
    const types = (body.options?.followup_types ?? []).flatMap((row) =>
      row.value && row.label ? [{ id: row.value, text: row.label }] : [],
    );
    const type = types.find((row) => row.id === body.defaults?.followup_type) ?? types[0];
    if (!type) throw new Error(`Follow-up form for lead ${leadId} returned no type`);
    const reasons = (body.options?.cancellation_reasons ?? []).flatMap((row) =>
      row.value && row.label ? [{ id: row.value, text: row.label }] : [],
    );
    const requiredFields = (body.custom_fields ?? []).flatMap((field) =>
      field.required && field.name && field.label && field.type
        ? [{ name: field.name, label: field.label, type: field.type }]
        : [],
    );
    return {
      type,
      timeZone: body.defaults?.time_zone ?? "",
      requiredFields,
      cancellationReasons: reasons,
    };
  }

  /** `POST /api/v3/client/leads/:id/followups`. */
  async schedule(leadId: string, input: ScheduleFollowupInput): Promise<string> {
    const { body } = await this.v3.post<{ followup?: { _id?: string } }>(`/api/v3/client/leads/${leadId}/followups`, {
      headers: this.authHeaders(),
      json: {
        followup: {
          followup_type: input.typeId,
          scheduled_on: input.scheduledOn,
          subject: input.subject,
          agenda: input.agenda,
        },
      },
    });
    const id = body.followup?._id;
    if (!id) throw new Error("Follow-up create returned no id");
    return id;
  }

  /** `PATCH /api/v3/client/followups/:id/status` with status `conducted`. */
  async markConducted(followupId: string): Promise<void> {
    await this.v3.patch(`/api/v3/client/followups/${followupId}/status`, {
      headers: this.authHeaders(),
      json: { followup: { status: "conducted" } },
    });
  }

  /**
   * Cancel the way the app does: status plus reason, then the note on the follow-up itself
   * (`FollowupCancelDraft.toV3CancelStatusJson` and `toV3CancellationNoteJson`).
   */
  async cancel(followupId: string, reason: string, note: string): Promise<void> {
    await this.v3.patch(`/api/v3/client/followups/${followupId}/status`, {
      headers: this.authHeaders(),
      json: { followup: { status: "cancelled", cancellation_reason: reason } },
    });
    if (note.trim()) {
      await this.v3.patch(`/api/v3/client/followups/${followupId}`, {
        headers: this.authHeaders(),
        json: { followup: { cancellation_note: note } },
      });
    }
  }

  /** `GET /client/leads/:id/activities.json?filters[_type]=Followup`. */
  async listForLead(leadId: string): Promise<FollowupRecord[]> {
    const { body } = await this.legacy.get<{ results?: ActivityRow[] }>(`/client/leads/${leadId}/activities.json`, {
      query: {
        api_key: settings.credentials.fullAccessApiKey,
        client_id: settings.credentials.clientId,
        "filters[_type]": "Followup",
        page: 1,
        per_page: 50,
      },
    });
    return (body.results ?? []).flatMap((row) => {
      const followup = row.followup;
      if (!followup?._id) return [];
      return [{
        id: followup._id,
        status: followup.status ?? "",
        scheduledOn: followup.scheduled_on ?? "",
        followupType: followup.followup_type ?? "",
        subject: followup.subject ?? "",
        agenda: followup.agenda ?? "",
        cancellationReason: followup.cancellation_reason ?? "",
        cancellationNote: followup.cancellation_note ?? "",
      }];
    });
  }

  async bySubject(leadId: string, subject: string): Promise<FollowupRecord> {
    const followups = await this.listForLead(leadId);
    const found = followups.find((followup) => followup.subject === subject);
    if (!found) throw new Error(`No follow-up with subject "${subject}" on lead ${leadId}`);
    return found;
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.accessToken}`, "X-Selldo-Request": "1" };
  }
}
