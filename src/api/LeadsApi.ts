import { settings } from "../config/environment.ts";
import { ClientConfigApi } from "./ClientConfigApi.ts";
import { HttpClient, sleep } from "./HttpClient.ts";

/** `lead` block of `Api::LeadsController#process_lead_data` (full-access key returns the lead's ui_json). */
export interface RetrievedLead {
  id: string;
  lead_id?: number | string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface RetrieveLeadResponse {
  exists: boolean;
  status: number;
  lead?: RetrievedLead;
  sales_details?: { id: string; name: string; team?: string };
  sales_phone?: string;
}

export interface CreateLeadInput {
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  subSource?: string;
  projectIds?: string[];
  salesId?: string;
  campaignId?: string;
}

export interface CreateLeadResponse {
  sell_do_lead_id?: string;
  selldo_lead_id?: string;
  error?: string | string[];
  [key: string]: unknown;
}

export class LeadsApi {
  private readonly http = new HttpClient(settings.apiBaseUrl);

  /**
   * `GET /api/leads/:type/retrieve_lead` (Api::LeadsController#retrieve_lead).
   * Type is inferred from the value: "@" means email, otherwise phone.
   */
  async retrieve(value: string): Promise<RetrieveLeadResponse> {
    const type = value.includes("@") ? "email" : "phone";
    const { body } = await this.http.get<RetrieveLeadResponse>(`/api/leads/${type}/retrieve_lead`, {
      query: {
        api_key: settings.credentials.fullAccessApiKey,
        client_id: settings.credentials.clientId,
        value,
      },
    });
    return body;
  }

  /**
   * Polls retrieve_lead until the lead is visible. Lead creation commits before the app
   * shows its success snackbar, but lookups go through the contact index, so allow a short lag.
   */
  /** Polls retrieve_lead until the lead is gone. Delete is queued, so the row can outlive the snackbar. */
  async retrieveUntilGone(value: string, timeoutMs = 90_000, intervalMs = 3_000): Promise<RetrieveLeadResponse> {
    const deadline = Date.now() + timeoutMs;
    let latest: RetrieveLeadResponse = { exists: true, status: 0 };
    for (;;) {
      latest = await this.retrieve(value);
      if (!latest.exists) return latest;
      if (Date.now() >= deadline) {
        throw new Error(`Lead "${value}" was still returned by retrieve_lead after ${timeoutMs / 1000}s`);
      }
      await sleep(intervalMs);
    }
  }

  async retrieveWhenExists(value: string, timeoutMs = 60_000, intervalMs = 3_000): Promise<RetrieveLeadResponse> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const response = await this.retrieve(value);
      if (response.exists) return response;
      if (Date.now() >= deadline) {
        throw new Error(`Lead "${value}" not returned by retrieve_lead within ${timeoutMs / 1000}s`);
      }
      await sleep(intervalMs);
    }
  }

  /**
   * `POST /api/leads/create` with the client's website (restricted) API key, resolved from
   * `/client/api_clients.json` - the public lead-capture contract.
   * Use for test-data setup; never retried, so a lead is not created twice.
   */
  async create(input: CreateLeadInput): Promise<CreateLeadResponse> {
    const { body } = await this.http.post<CreateLeadResponse>("/api/leads/create", {
      json: {
        api_key: await new ClientConfigApi().websiteApiKey(),
        sell_do: {
          form: {
            lead: {
              name: input.name,
              email: input.email,
              phone: input.phone,
              source: input.source,
              sub_source: input.subSource,
              project_id: input.projectIds,
              sales: input.salesId,
              campaign_id: input.campaignId ?? "",
            },
          },
        },
      },
    });
    const error = Array.isArray(body.error) ? body.error.join(", ") : String(body.error ?? "");
    if (error.trim()) throw new Error(`Lead create rejected: ${error}`);
    return body;
  }
}

/** Project ids still marked interested on a `retrieve_lead` payload (`status !== false`). */
export function currentProjectIds(lead: RetrievedLead | undefined): string[] {
  const rows = lead?.interested_projects;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    if (item.status === false) return [];
    const id = String(item.project_id ?? "");
    return id ? [id] : [];
  });
}
