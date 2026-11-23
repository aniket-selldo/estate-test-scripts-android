import { attachJson } from "../core/reporting.ts";
import { utcMinute, utcStamp } from "../data/schedule.ts";
import { ApiError, HttpClient } from "./HttpClient.ts";
import { FollowupsApi } from "./FollowupsApi.ts";
import { settings } from "../config/environment.ts";
import { SiteVisitsApi } from "./SiteVisitsApi.ts";

export type ScheduleKind = "Followup" | "SiteVisit";

export interface ClearSlotInput {
  /** Lead the schedule is about to use. The clash lookup is scoped to this lead. */
  leadId: string;
  /** Owner whose calendar is being cleared. Site visits owned by someone else are left alone. */
  salesUserId: string;
  /** What the test is about to schedule. Both follow-ups and site visits in the window are cleared. */
  kind: ScheduleKind;
  /** Inclusive start of the slot, local `Date` (tomorrow 1 PM for a site visit, 2 PM for a follow-up). */
  scheduledOn: Date;
  /** Inclusive end. A follow-up uses the same instant as `scheduledOn`. */
  endsOn: Date;
  /** Sent on the site-visit clash lookup so a same-project-same-day block can be cleared. */
  projectId?: string;
  /** The activity being rescheduled. It stays scheduled. */
  exceptActivityId?: string;
}

interface OpenActivity {
  id: string;
  kind: ScheduleKind;
}

interface ActivityListBody {
  total?: number;
  results?: {
    id?: string;
    type?: string;
    status?: string;
    scheduled_on?: string;
    sales_id?: string;
  }[];
}

interface ScheduledEventsBody {
  events?: {
    id?: string;
    activity_type?: string;
  }[];
}

const PAGE_SIZE = 50;
const MAX_PAGES = 20;
const OPEN_STATUSES = new Set(["scheduled", "pending"]);

/**
 * Frees a schedule slot before a follow-up or site visit is booked.
 *
 * Auth is the sales user's v3 JWT (`POST /api/v3/users/login`). The full-access
 * key cannot call `/api/v3/*`. The legacy activities feed, used only when the
 * clash lookup reports a same-project site visit, is the one full-key read.
 *
 * Lookups:
 *   GET /api/v3/client/leads/:id/scheduled_events
 *     (Api::V3::Client::Leads::ScheduledEventsController#index, V3::Leads::ScheduledEvents::List)
 *     Required query: `type` (`Followup` or `SiteVisit`), `scheduled_on`, `ends_on`
 *     (UTC `yyyy-MM-dd HH:mm`). Optional: `project_id`, `activity_id`.
 *   GET /api/v3/client/lead/activities
 *     (Api::V3::Client::Lead::ActivitiesController#index)
 *     Required query: `type`. `segment` is `scheduled` or `pending`.
 *
 * Conduct (required body is only the new status; the server sets the acted/conducted time to now):
 *   PATCH /api/v3/client/followups/:id/status        `{ followup: { status: "conducted" } }`
 *   PATCH /api/v3/client/site_visits/:id/status      `{ site_visit: { status: "conducted" } }`
 * Both accept only `scheduled` or `pending`. A row that is already closed is skipped.
 */
export class ScheduleSlotApi {
  private readonly v3 = new HttpClient(settings.v3ApiBaseUrl);
  private readonly followups: FollowupsApi;
  private readonly visits: SiteVisitsApi;

  constructor(private readonly accessToken: string) {
    this.followups = new FollowupsApi(accessToken);
    this.visits = new SiteVisitsApi(accessToken);
  }

  /** Marks every open follow-up and site visit in the window as conducted. */
  async markOpenAt(input: ClearSlotInput): Promise<void> {
    this.assertInput(input);
    const found = new Map<string, OpenActivity>();
    for (const activity of await this.clashes(input)) this.keep(found, activity, input.exceptActivityId);
    for (const activity of await this.listed(input)) this.keep(found, activity, input.exceptActivityId);

    const marked: string[] = [];
    const failures: string[] = [];
    for (const activity of found.values()) {
      try {
        await this.conduct(activity);
        marked.push(`${activity.kind} ${activity.id}`);
      } catch (error) {
        if (error instanceof ApiError && alreadyClosed(error)) continue;
        failures.push(`${activity.kind} ${activity.id}: ${errorText(error)}`);
      }
    }
    attachJson("Cleared schedule slot", {
      from: utcStamp(input.scheduledOn),
      to: utcStamp(input.endsOn),
      marked,
      failures,
    });
    if (failures.length > 0) {
      throw new Error(
        `Could not mark ${failures.length} ${failures.length === 1 ? "activity" : "activities"} conducted before scheduling. ${failures.join(" | ")}`,
      );
    }
  }

  private assertInput(input: ClearSlotInput): void {
    if (!this.accessToken.trim()) {
      throw new Error(
        "Clearing a schedule slot needs the sales user's v3 access token. The full-access API key cannot call /api/v3.",
      );
    }
    if (!input.leadId.trim()) throw new Error("Clearing a schedule slot needs the lead id.");
    if (!input.salesUserId.trim()) throw new Error("Clearing a schedule slot needs the sales user id.");
    if (input.kind !== "Followup" && input.kind !== "SiteVisit") {
      throw new Error(`Schedule type must be Followup or SiteVisit. Got: ${input.kind}`);
    }
    if (Number.isNaN(input.scheduledOn.getTime()) || Number.isNaN(input.endsOn.getTime())) {
      throw new Error("Clearing a schedule slot needs a valid start and end.");
    }
    if (input.endsOn.getTime() < input.scheduledOn.getTime()) {
      throw new Error("The schedule slot ends before it starts.");
    }
  }

  /** Owner clashes from the same lookup the schedule screen uses, for both activity types. */
  private async clashes(input: ClearSlotInput): Promise<OpenActivity[]> {
    const found: OpenActivity[] = [];
    for (const type of ["Followup", "SiteVisit"] as const) {
      try {
        const { body } = await this.v3.get<ScheduledEventsBody>(
          `/api/v3/client/leads/${input.leadId}/scheduled_events`,
          {
            headers: this.authHeaders(),
            query: {
              type,
              scheduled_on: utcStamp(input.scheduledOn),
              ends_on: utcStamp(input.endsOn),
              ...(input.exceptActivityId ? { activity_id: input.exceptActivityId } : {}),
              ...(type === "SiteVisit" && input.projectId ? { project_id: input.projectId } : {}),
            },
          },
        );
        for (const event of body.events ?? []) {
          const kind = event.activity_type === "Followup" || event.activity_type === "SiteVisit" ? event.activity_type : "";
          if (!event.id || !kind) continue;
          found.push({ id: event.id, kind });
        }
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
        const message = apiMessage(error);
        if (error.status === 422 && /same project/i.test(message)) {
          found.push(...(await this.sameProjectVisits(input, message)));
          continue;
        }
        throw new Error(`Could not read activities already booked at this time (${type}). ${message}`);
      }
    }
    return found;
  }

  /** Open site visits on this lead and project. The clash lookup names the block but not the ids. */
  private async sameProjectVisits(input: ClearSlotInput, message: string): Promise<OpenActivity[]> {
    if (!input.projectId) throw new Error(`Could not clear the site-visit slot. ${message}`);
    const visits = await this.visits.listForLead(input.leadId);
    return visits.flatMap((visit) => {
      if (visit.projectId !== input.projectId || !OPEN_STATUSES.has(visit.status)) return [];
      return [{ id: visit.id, kind: "SiteVisit" as const }];
    });
  }

  /** Open rows on the sales user's own lists whose scheduled time falls in the window. */
  private async listed(input: ClearSlotInput): Promise<OpenActivity[]> {
    const fromDay = dayStamp(addDays(input.scheduledOn, -1));
    const toDay = dayStamp(addDays(input.endsOn, 1));
    const found: OpenActivity[] = [];
    for (const type of ["Followup", "SiteVisit"] as const) {
      for (const segment of ["scheduled", "pending"] as const) {
        found.push(...(await this.listSegment(input, type, segment, fromDay, toDay)));
      }
    }
    return found;
  }

  private async listSegment(
    input: ClearSlotInput,
    type: ScheduleKind,
    segment: "scheduled" | "pending",
    fromDay: string,
    toDay: string,
  ): Promise<OpenActivity[]> {
    const rules = JSON.stringify([
      { field: "scheduled_on", operator: "between", type: "DATETIME_PICKER", value: [fromDay, toDay] },
    ]);
    const found: OpenActivity[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      let body: ActivityListBody;
      try {
        ({ body } = await this.v3.get<ActivityListBody>("/api/v3/client/lead/activities", {
          headers: this.authHeaders(),
          query: { type, segment, page, per_page: PAGE_SIZE, sort: "scheduled_on", dir: "asc", smart_filter_rules: rules },
        }));
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
        throw new Error(`Could not list ${segment} ${type === "Followup" ? "follow-ups" : "site visits"}. ${apiMessage(error)}`);
      }
      const rows = body.results ?? [];
      for (const row of rows) {
        if (!row.id || !OPEN_STATUSES.has(row.status ?? "")) continue;
        if (type === "SiteVisit" && row.sales_id && row.sales_id !== input.salesUserId) continue;
        if (!inWindow(row.scheduled_on ?? "", input)) continue;
        found.push({ id: row.id, kind: type });
      }
      const total = body.total ?? rows.length;
      if (rows.length < PAGE_SIZE || page * PAGE_SIZE >= total) return found;
    }
    throw new Error(
      `The ${type === "Followup" ? "follow-up" : "site visit"} list still has more than ${MAX_PAGES * PAGE_SIZE} open rows between ${fromDay} and ${toDay}. The slot was not fully cleared.`,
    );
  }

  private keep(found: Map<string, OpenActivity>, activity: OpenActivity, exceptId?: string): void {
    if (!activity.id || activity.id === exceptId) return;
    found.set(`${activity.kind}:${activity.id}`, activity);
  }

  private async conduct(activity: OpenActivity): Promise<void> {
    if (activity.kind === "Followup") {
      await this.followups.markConducted(activity.id);
      return;
    }
    await this.visits.setStatus(activity.id, "conducted");
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.accessToken}`, "X-Selldo-Request": "1" };
  }
}

function inWindow(scheduledOn: string, input: ClearSlotInput): boolean {
  const minute = utcMinute(scheduledOn);
  return minute >= utcMinute(utcStamp(input.scheduledOn)) && minute <= utcMinute(utcStamp(input.endsOn));
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function dayStamp(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function apiMessage(error: ApiError): string {
  try {
    const parsed = JSON.parse(error.body) as { errors?: unknown; error?: unknown };
    const raw = parsed.errors ?? parsed.error;
    if (Array.isArray(raw)) {
      const lines = raw.map((item) => String(item).trim()).filter(Boolean);
      if (lines.length) return lines.join("; ");
    }
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  } catch {
    // The body is not JSON; the status line below still names the failure.
  }
  return error.message;
}

function errorText(error: unknown): string {
  return error instanceof ApiError ? apiMessage(error) : error instanceof Error ? error.message : String(error);
}

/** A 404, or a transition the model refuses because the row is no longer scheduled or pending. */
function alreadyClosed(error: ApiError): boolean {
  if (error.status === 404) return true;
  const text = apiMessage(error).toLowerCase();
  return text.includes("cannot change status") || text.includes("cannot conduct unless") || text.includes("not found");
}
