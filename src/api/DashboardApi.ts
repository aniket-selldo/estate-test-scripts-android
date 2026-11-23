import { settings } from "../config/environment.ts";
import { HttpClient, sleep } from "./HttpClient.ts";
import { v3Headers } from "./v3Auth.ts";

/**
 * Today's Performance, as `parseDashboardStats` reads it
 * (`lib/features/dashboard/data/model/dashboard_stats.dart`).
 * Counts are the raw Redis numbers. The app rounds a duration with `num.round`.
 */
export interface TodaysPerformanceStats {
  totalCalls: number;
  totalTalktime: number;
  totalAnswered: number;
  avgCallDuration: number;
  avgCallbackTime: number;
  timeToFirstContact: number;
  siteVisitsCreated: number;
  siteVisitsScheduled: number;
  siteVisitsConducted: number;
  followupsScheduled: number;
  leadsFromPreSales: number;
  /** Unix seconds from `last_refresh_at`. Null when the payload has none. */
  lastRefreshAt: number | null;
}

/**
 * `GET` and `POST /api/v3/client/home-dashboard/stats|refresh`
 * (Api::V3::Client::HomeDashboardController#stats/#refresh).
 *
 * Refresh enqueues `UpdateDashboardStatsWorker` and returns the stats already in Redis.
 * A sales user is always told `refresh_status` 1, so the screen does not keep polling.
 * The worker writes a new `last_refresh_at` when it finishes. The app waits up to two
 * minutes for a manager (24 polls, 5 seconds apart). This client does the same.
 */
export class DashboardApi {
  private readonly http = new HttpClient(settings.v3ApiBaseUrl);

  constructor(private readonly accessToken: string) {}

  /** `GET /api/v3/client/home-dashboard/stats`. */
  async fetch(): Promise<TodaysPerformanceStats> {
    const { body } = await this.http.get<unknown>("/api/v3/client/home-dashboard/stats", {
      headers: v3Headers(this.accessToken),
    });
    return parseStats(body);
  }

  /**
   * `POST /api/v3/client/home-dashboard/refresh`, then poll stats until `ready`.
   * `ready` is only asked after `last_refresh_at` has moved, so the numbers are from this recompute.
   */
  async afterRecompute(
    ready: (stats: TodaysPerformanceStats) => boolean,
    timeoutMs = 120_000,
  ): Promise<TodaysPerformanceStats> {
    const previous = await this.fetch();
    await this.http.post("/api/v3/client/home-dashboard/refresh", {
      headers: v3Headers(this.accessToken),
    });
    const deadline = Date.now() + timeoutMs;
    let latest = previous;
    for (;;) {
      latest = await this.fetch();
      const recomputed = (latest.lastRefreshAt ?? 0) > (previous.lastRefreshAt ?? 0);
      if (recomputed && ready(latest)) return latest;
      if (Date.now() >= deadline) {
        throw new Error(
          `Today's Performance did not recompute within ${timeoutMs / 1000}s. ` +
            `Last refresh ${latest.lastRefreshAt ?? "none"} (was ${previous.lastRefreshAt ?? "none"}). ` +
            `Last stats: ${JSON.stringify(latest)}`,
        );
      }
      await sleep(5_000);
    }
  }
}

function parseStats(body: unknown): TodaysPerformanceStats {
  const json = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const refreshed = json.last_refresh_at;
  const lastRefreshAt = typeof refreshed === "number" ? refreshed : typeof refreshed === "string" ? Number(refreshed) : null;
  return {
    totalCalls: num(json.total_calls),
    totalTalktime: num(json.total_talktime),
    totalAnswered: num(json.total_answered),
    avgCallDuration: num(json.avg_call_duration),
    avgCallbackTime: num(json.avg_callback_time),
    timeToFirstContact: num(json.time_to_first_contact),
    siteVisitsCreated: num(json.sv_created),
    siteVisitsScheduled: num(json.sv_scheduled),
    siteVisitsConducted: num(json.sv_conducted),
    followupsScheduled: num(json.followup_scheduled),
    leadsFromPreSales: num(json.pushed_to_sales),
    lastRefreshAt: lastRefreshAt != null && Number.isFinite(lastRefreshAt) ? lastRefreshAt : null,
  };
}

function num(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && value !== "N/A") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}
