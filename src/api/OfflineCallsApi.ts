import { settings } from "../config/environment.ts";
import { HttpClient } from "./HttpClient.ts";
import { v3Headers } from "./v3Auth.ts";

export interface LoggedOfflineCall {
  id: string;
  status: string;
  direction: number;
  duration: number;
}

interface CreateBody {
  call_id?: string;
  status?: string;
  direction?: number;
  duration?: number;
  errors?: string[];
}

/**
 * `POST /api/v3/client/leads/:id/offline_calls`
 * (Api::V3::Client::Leads::OfflineCallsController#create -> V3::Leads::OfflineCalls::Create).
 *
 * The app nests these under `offline_call` and sends `created_at`. The controller reads
 * top-level `called_at`, `direction`, `status` and `duration`, which is the payload that stores a call.
 * Direction `2` is outbound. Status `ANSWERED` is stored as `answered`.
 * The call is `offline: true` with vendor `CallManager::OfflinecallManager`.
 */
export class OfflineCallsApi {
  private readonly http = new HttpClient(settings.v3ApiBaseUrl);

  constructor(private readonly accessToken: string) {}

  /**
   * `GET /api/v3/client/leads/:id/offline_calls/new`
   * (Api::V3::Client::Leads::OfflineCallsController#new -> V3::Leads::OfflineCalls::Form#flags).
   *
   * `flags.schedule_followup` is true only when `offline_call_strategy` is 2. Strategy 0 and
   * strategy 1 both leave a manually logged call (`offline: true`, vendor
   * `CallManager::OfflinecallManager`) out of today's call totals, so this flag is the split
   * `UpdateDashboardStatsWorker` uses. The strategy radio itself is on a support-only tab.
   */
  async countsManuallyLogged(leadId: string): Promise<boolean> {
    const { body } = await this.http.get<{ flags?: { schedule_followup?: boolean } }>(
      `/api/v3/client/leads/${leadId}/offline_calls/new`,
      { headers: v3Headers(this.accessToken) },
    );
    const counted = body.flags?.schedule_followup;
    if (typeof counted !== "boolean") {
      throw new Error("The offline call form did not say whether a manually logged call is counted");
    }
    return counted;
  }

  async logAnswered(input: {
    leadId: string;
    /** ISO-8601. Stored as the call's `created_at`, which is what today's performance counts. */
    calledAt: string;
    /** Seconds. An answered call must be greater than 0, and must end by now. */
    durationSeconds: number;
    notes: string;
  }): Promise<LoggedOfflineCall> {
    const { body } = await this.http.post<CreateBody>(`/api/v3/client/leads/${input.leadId}/offline_calls`, {
      headers: v3Headers(this.accessToken),
      json: {
        direction: 2,
        status: "ANSWERED",
        called_at: input.calledAt,
        duration: input.durationSeconds,
        notes: input.notes,
      },
    });
    if (!body.call_id) {
      throw new Error(`Offline call was not stored${body.errors?.length ? `: ${body.errors.join(" ")}` : ""}`);
    }
    return {
      id: body.call_id,
      status: body.status ?? "",
      direction: body.direction ?? 0,
      duration: body.duration ?? 0,
    };
  }
}
