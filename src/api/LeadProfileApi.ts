import { settings } from "../config/environment.ts";
import { HttpClient, sleep } from "./HttpClient.ts";
import { v3Headers } from "./v3Auth.ts";

export interface Choice {
  id: string;
  text: string;
}

export interface StageOption extends Choice {
  statuses: string[];
}

/** `GET /api/v3/client/leads/:id/stage`. */
export interface StageForm {
  current: string;
  /** `sales` or `pre_sales`. The feed names the pipeline in parentheses. */
  pipeline: string;
  stages: StageOption[];
}

/** What `GET /api/v3/client/leads/:id` says this user may do. */
export interface LeadAccess {
  isMine: boolean;
  edit: boolean;
  pushToSales: boolean;
  reassign: boolean;
  note: boolean;
  /** `actions.email`. True only when the user owns the lead, it has an email, and email is enabled. */
  email: boolean;
  /** `actions.email_feed`. The Emails tab stays available when email is enabled, even for another user. */
  emailFeed: boolean;
  merge: boolean;
  delete: boolean;
  offlineCall: boolean;
  conductedSiteVisit: boolean;
  stage: string;
  currentlyIn: string;
  salesId: string;
  messages: string[];
}

/** One row from `GET /client/leads/:id/activities.json`. */
export interface ActivityRecord {
  /** Activity wrapper key, lowercased (`call`, `note`, `feed`). */
  type: string;
  fields: Record<string, unknown>;
}

export interface FeedItem {
  /** Activity `_type` lowered, e.g. `feed`. */
  type: string;
  feedType: string;
  content: string;
}

const CLOSED_STAGES = new Set(["booked", "lost", "unqualified"]);

/**
 * Lead profile calls the app makes with the signed-in user's JWT, plus the
 * full-access activities feed used to assert what the conversation recorded.
 */
export class LeadProfileApi {
  private readonly v3 = new HttpClient(settings.v3ApiBaseUrl);
  private readonly legacy = new HttpClient(settings.apiBaseUrl);

  constructor(private readonly accessToken: string) {}

  /** `GET /api/v3/client/leads/:id` (Api::V3::Client::LeadsController#show). */
  async access(leadId: string): Promise<LeadAccess> {
    const { body } = await this.v3.get<unknown>(`/api/v3/client/leads/${leadId}`, { headers: this.auth() });
    const lead = objectOf(body);
    const actions = objectOf(lead.actions);
    const messages = Array.isArray(lead.access_messages) ? lead.access_messages.map((item) => String(item)) : [];
    const sales = objectOf(objectOf(lead.extras).sales_id);
    return {
      isMine: lead.isMine === true || lead.is_mine === true,
      edit: actions.edit === true,
      pushToSales: actions.push_to_sales === true,
      reassign: actions.reassign === true,
      note: actions.note === true,
      email: actions.email === true,
      emailFeed: actions.email_feed === true,
      merge: actions.merge === true,
      delete: actions.delete === true,
      offlineCall: actions.offline_call === true,
      conductedSiteVisit: actions.conducted_site_visit === true,
      stage: text(lead.stage),
      currentlyIn: text(lead.currently_in),
      salesId: text(sales.id) || text(lead.sales_id),
      messages,
    };
  }

  /** `GET /api/v3/client/leads/:id/stage` (Api::V3::Client::LeadStagesController#new). */
  async stageForm(leadId: string): Promise<StageForm> {
    const { body } = await this.v3.get<unknown>(`/api/v3/client/leads/${leadId}/stage`, { headers: this.auth() });
    const root = objectOf(body);
    const stages = (Array.isArray(root.stages) ? root.stages : []).flatMap((row) => {
      const item = objectOf(row);
      const id = text(item.stage);
      const label = text(item.label);
      if (!id || !label) return [];
      const statuses = Array.isArray(item.statuses) ? item.statuses.map((status) => String(status)).filter(Boolean) : [];
      return [{ id, text: label, statuses }];
    });
    if (stages.length === 0) throw new Error(`Stage form for lead ${leadId} returned no stages`);
    return { current: text(root.current_stage), pipeline: text(root.pipeline) || "sales", stages };
  }

  /**
   * A stage the sheet can save without a reason. Booked opens the booking flow.
   * Lost and unqualified require a stage-change reason.
   * `except` also drops the current stage and, for push setup, `incoming`.
   */
  movableStage(form: StageForm, except: string[] = []): StageOption {
    const blocked = new Set([...CLOSED_STAGES, form.current, ...except]);
    const open = form.stages.filter((item) => !blocked.has(item.id));
    // Prefer a stage with no status list. Some stages publish statuses the save then rejects.
    const stage = open.find((item) => item.statuses.length === 0) ?? open[0];
    if (!stage) throw new Error(`No open stage besides ${[...blocked].join(", ")}`);
    return stage;
  }

  /** `PATCH /api/v3/client/leads/:id/stage` (Api::V3::Client::LeadStagesController#update). */
  async changeStage(leadId: string, stage: StageOption): Promise<void> {
    await this.v3.patch(`/api/v3/client/leads/${leadId}/stage`, {
      headers: this.auth(),
      json: { stage: stage.id, ...(stage.statuses[0] ? { status: stage.statuses[0] } : {}) },
    });
  }

  /**
   * `PATCH /api/v3/client/leads/:id` (V3::Leads::Update#write_projects).
   * Names are sent again because Update assigns first and last name on every save.
   */
  async addProject(leadId: string, projectId: string, name: { firstName: string; lastName: string }): Promise<void> {
    await this.v3.patch(`/api/v3/client/leads/${leadId}`, {
      headers: this.auth(),
      json: {
        lead: {
          first_name: name.firstName,
          last_name: name.lastName,
          project_ids: [projectId],
        },
      },
    });
  }

  /** `GET /api/v3/client/leads/lookups?type=salutations`. */
  async salutations(): Promise<Choice[]> {
    const { body } = await this.v3.get<unknown>("/api/v3/client/leads/lookups", {
      headers: this.auth(),
      query: { type: "salutations" },
    });
    const options = choicesFrom(body);
    if (options.length === 0) throw new Error("Salutation lookup returned no options");
    return options;
  }

  /**
   * `GET /api/v3/client/users/lookups?type=teams` or `type=projects`.
   * Push to sales asks for sales teams (`department=sales`); reassign does not.
   */
  async groups(kind: "teams" | "projects", extra: Record<string, string> = {}): Promise<Choice[]> {
    const { body } = await this.v3.get<unknown>("/api/v3/client/users/lookups", {
      headers: this.auth(),
      query: { type: kind, ...extra },
    });
    const options = choicesFrom(body);
    if (options.length === 0) throw new Error(`${kind} lookup returned no options`);
    return options;
  }

  /**
   * People the reassign form can assign for one team or project.
   * `GET /api/v3/client/users/lookups?type=users&provider=reassign_lead`.
   */
  async reassignUsers(kind: "team" | "project", groupId: string): Promise<Choice[]> {
    const { body } = await this.v3.get<unknown>("/api/v3/client/users/lookups", {
      headers: this.auth(),
      query: {
        type: "users",
        provider: "reassign_lead",
        ...(kind === "project" ? { project_id: groupId } : { team_ids: groupId }),
      },
    });
    return choicesFrom(body);
  }

  /**
   * Sales people Push to sales lists for one team or project.
   * `GET /api/v3/client/users/lookups` with `assign_leads` and `department=sales`.
   */
  async pushUsers(byProject: boolean, groupId: string): Promise<Choice[]> {
    const { body } = await this.v3.get<unknown>("/api/v3/client/users/lookups", {
      headers: this.auth(),
      query: {
        type: "users",
        department: "sales",
        assign_leads: "true",
        ...(byProject ? { project_id: groupId } : { team_ids: groupId }),
      },
    });
    return choicesFrom(body);
  }

  /**
   * `GET /api/v3/client/lead_bulk_reassignments/new`.
   * Empty when this user cannot load reasons. The payload is a list or an `{ id: label }` map.
   */
  async reassignmentReasons(): Promise<Choice[]> {
    try {
      const { body } = await this.v3.get<unknown>("/api/v3/client/lead_bulk_reassignments/new", { headers: this.auth() });
      const reasons = objectOf(body).reasons ?? body;
      if (reasons && typeof reasons === "object" && !Array.isArray(reasons)) {
        return Object.entries(reasons as Record<string, unknown>).flatMap(([id, label]) =>
          id ? [{ id, text: typeof label === "string" && label.trim() ? label.trim() : id }] : [],
        );
      }
      return choicesFrom(reasons);
    } catch {
      return [];
    }
  }

  /** `GET /client/leads/:id/activities.json?filters[_type]=Feed`. */
  async feeds(leadId: string): Promise<FeedItem[]> {
    const { body } = await this.legacy.get<{ results?: Record<string, Record<string, unknown>>[] }>(
      `/client/leads/${leadId}/activities.json`,
      {
        query: {
          api_key: settings.credentials.fullAccessApiKey,
          client_id: settings.credentials.clientId,
          "filters[_type]": "Feed",
          page: 1,
          per_page: 50,
        },
      },
    );
    return (body.results ?? []).flatMap((row) => {
      const type = Object.keys(row)[0];
      const fields = type ? row[type] : undefined;
      if (!type || !fields) return [];
      return [{ type: type.toLowerCase(), feedType: text(fields.feed_type), content: text(fields.content) }];
    });
  }

  /**
   * `GET /client/leads/:id/activities.json?filters[_type]=`.
   * `activityType` is the web filter: `Note`, `Call`, `Feed`, `SiteVisit`, `MergeLeads`.
   */
  async records(leadId: string, activityType: string): Promise<ActivityRecord[]> {
    const { body } = await this.legacy.get<{ results?: Record<string, Record<string, unknown>>[] }>(
      `/client/leads/${leadId}/activities.json`,
      {
        query: {
          api_key: settings.credentials.fullAccessApiKey,
          client_id: settings.credentials.clientId,
          "filters[_type]": activityType,
          page: 1,
          per_page: 50,
        },
      },
    );
    return (body.results ?? []).flatMap((row) => {
      const type = Object.keys(row)[0];
      const fields = type ? row[type] : undefined;
      if (!type || !fields) return [];
      return [{ type: type.toLowerCase(), fields }];
    });
  }

  /** Polls one activity type until a row matches. Workers write notes, calls and merges after the app closes. */
  async recordWhen(
    leadId: string,
    activityType: string,
    matches: (fields: Record<string, unknown>) => boolean,
    timeoutMs = 60_000,
  ): Promise<ActivityRecord> {
    const deadline = Date.now() + timeoutMs;
    let latest: ActivityRecord[] = [];
    for (;;) {
      latest = await this.records(leadId, activityType);
      const found = latest.find((row) => matches(row.fields));
      if (found) return found;
      if (Date.now() >= deadline) {
        const seen = latest.map((row) => JSON.stringify(row.fields)).join(" | ") || "none";
        throw new Error(`No matching ${activityType} on lead ${leadId} within ${timeoutMs / 1000}s. Seen: ${seen.slice(0, 1500)}`);
      }
      await sleep(3_000);
    }
  }

  /** Polls the feed until one item matches. Stage and reassign feeds are written by a worker. */
  async feedWhen(leadId: string, matches: (feed: FeedItem) => boolean, timeoutMs = 60_000): Promise<FeedItem> {
    const deadline = Date.now() + timeoutMs;
    let latest: FeedItem[] = [];
    for (;;) {
      latest = await this.feeds(leadId);
      const found = latest.find(matches);
      if (found) return found;
      if (Date.now() >= deadline) {
        const seen = latest.map((feed) => `${feed.feedType}: ${feed.content}`).join(" | ") || "none";
        throw new Error(`No matching feed on lead ${leadId} within ${timeoutMs / 1000}s. Seen: ${seen}`);
      }
      await sleep(3_000);
    }
  }

  private auth(): Record<string, string> {
    return v3Headers(this.accessToken);
  }
}

function text(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function objectOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** `{ id, text | name | label }` rows from a lookup, a list, or `{ results | data }`. */
function choicesFrom(body: unknown): Choice[] {
  const rows = Array.isArray(body)
    ? body
    : Array.isArray(objectOf(body).results)
      ? (objectOf(body).results as unknown[])
      : Array.isArray(objectOf(body).data)
        ? (objectOf(body).data as unknown[])
        : [];
  return rows.flatMap((row) => {
    if (typeof row === "string") return [{ id: row, text: row }];
    const item = objectOf(row);
    const id = text(item.id) || text(item._id) || text(item.value);
    const label = text(item.text) || text(item.name) || text(item.label) || id;
    return id && label ? [{ id, text: label }] : [];
  });
}
