import { settings } from "../config/environment.ts";
import { HttpClient, sleep } from "./HttpClient.ts";
import { v3Headers } from "./v3Auth.ts";

export interface Choice {
  id: string;
  text: string;
}

export interface StageOption extends Choice {
  statuses: string[];
  /** Enabled drop-off reasons. Lost and unqualified require one. */
  reasons: Choice[];
  /** True when saving this stage asks the user to sync a channel partner. */
  qualifiedAsCp: boolean;
}

/** One pipeline from `GET /api/v3/client/lead_bulk_stage_changes/new`. */
export interface BulkPipeline {
  id: string;
  /** Picker label, "Sales" or "Pre Sales". */
  text: string;
  stages: BulkStageOption[];
}

/** A stage on the bulk form. `text` is the picker label; `name` is what the feed writes. */
export interface BulkStageOption extends StageOption {
  name: string;
}

/** A bulk target that is not the lead's current incoming stage. */
export interface BulkStageTarget {
  pipelineId: string;
  pipelineLabel: string;
  stageId: string;
  stageLabel: string;
  stageName: string;
  status: string;
  reason: string;
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
      const reasons = (Array.isArray(item.reasons) ? item.reasons : []).flatMap((row) => {
        const reason = objectOf(row);
        const reasonId = text(reason.id);
        const reasonLabel = text(reason.label) || reasonId;
        return reasonId ? [{ id: reasonId, text: reasonLabel }] : [];
      });
      return [{ id, text: label, statuses, reasons, qualifiedAsCp: item.qualified_as_cp === true }];
    });
    if (stages.length === 0) throw new Error(`Stage form for lead ${leadId} returned no stages`);
    return { current: text(root.current_stage), pipeline: text(root.pipeline) || "sales", stages };
  }

  /**
   * Lost or unqualified, with the first enabled drop-off reason.
   * The sheet blocks Save when that list is empty ("No reasons available").
   */
  dropOffStage(form: StageForm, stageId: "lost" | "unqualified"): StageOption {
    const stage = form.stages.find((item) => item.id === stageId);
    if (!stage) throw new Error(`Stage form has no "${stageId}" stage on the ${form.pipeline} pipeline`);
    if (stage.reasons.length === 0) {
      throw new Error(`Stage "${stage.text}" has no enabled stage-change reason`);
    }
    return stage;
  }

  /**
   * `GET /api/v3/client/lead_bulk_stage_changes/new`
   * (Api::V3::Client::LeadBulkStageChangesController#new).
   */
  async bulkStageForm(): Promise<BulkPipeline[]> {
    const { body } = await this.v3.get<unknown>("/api/v3/client/lead_bulk_stage_changes/new", { headers: this.auth() });
    const rows = Array.isArray(objectOf(body).pipelines) ? (objectOf(body).pipelines as unknown[]) : [];
    const pipelines = rows.flatMap((row) => {
      const item = objectOf(row);
      const id = text(item.id);
      const label = text(item.label);
      if (!id || !label) return [];
      const suffix = id === "pre_sales" ? "Pre-Sales" : "Sales";
      const marker = ` (${suffix})`;
      const stages = (Array.isArray(item.stages) ? item.stages : []).flatMap((stageRow) => {
        const stage = objectOf(stageRow);
        const stageId = text(stage.stage);
        const stageLabel = text(stage.label);
        if (!stageId || !stageLabel || stageId === "booked") return [];
        const statuses = Array.isArray(stage.statuses) ? stage.statuses.map((status) => String(status)).filter(Boolean) : [];
        const reasons = (Array.isArray(stage.reasons) ? stage.reasons : []).flatMap((reasonRow) => {
          const reason = objectOf(reasonRow);
          const reasonId = text(reason.id);
          const reasonLabel = text(reason.label) || reasonId;
          return reasonId ? [{ id: reasonId, text: reasonLabel }] : [];
        });
        const name = stageLabel.endsWith(marker) ? stageLabel.slice(0, -marker.length) : stageLabel;
        return [{ id: stageId, text: stageLabel, name, statuses, reasons, qualifiedAsCp: stage.qualified_as_cp === true }];
      });
      return [{ id, text: label, stages }];
    });
    if (pipelines.length === 0) throw new Error("Bulk stage form returned no pipelines");
    return pipelines;
  }

  /**
   * A stage the bulk sheet can apply to incoming leads.
   * BulkModifyLeadsStageWorker skips a lead whose stage does not change, so the
   * target is never `incoming`. Lost and unqualified need a reason; a stage with
   * no status list is preferred.
   */
  bulkTarget(pipelines: BulkPipeline[], pipelineId: string): BulkStageTarget {
    const pipeline = pipelines.find((item) => item.id === pipelineId);
    if (!pipeline) throw new Error(`Bulk stage form has no "${pipelineId}" pipeline`);
    const open = pipeline.stages.filter((item) => item.id !== "incoming" && !item.qualifiedAsCp && item.name.trim().length > 2);
    const stage = open.find((item) => item.statuses.length === 0 && item.reasons.length === 0) ?? open[0];
    if (!stage) throw new Error(`No bulk stage on ${pipeline.text} besides incoming`);
    return {
      pipelineId: pipeline.id,
      pipelineLabel: pipeline.text,
      stageId: stage.id,
      stageLabel: stage.text,
      stageName: stage.name,
      status: stage.statuses[0] ?? "",
      reason: stage.reasons[0]?.text ?? "",
    };
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

  /**
   * `POST /api/v3/client/leads/:id/push_to_sales`
   * (Api::V3::Client::Leads::SalesPushesController#create -> PushToSales.perform).
   * Omit `salesId` when pre-sales is set to auto-forward; the router picks the sales user.
   */
  async pushToSales(leadId: string, input: { salesId?: string; teamId?: string; projectId?: string }): Promise<void> {
    await this.v3.post(`/api/v3/client/leads/${leadId}/push_to_sales`, {
      headers: this.auth(),
      json: {
        ...(input.salesId ? { sales_id: input.salesId } : {}),
        ...(input.teamId ? { team_id: input.teamId } : {}),
        ...(input.projectId ? { project_id: input.projectId } : {}),
      },
    });
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
