import { settings } from "../config/environment.ts";
import { HttpClient, sleep } from "./HttpClient.ts";

export interface ScheduleSiteVisitInput {
  projectId: string;
  /** Data-provider id, e.g. the "Visit" type. */
  typeId: string;
  /** UTC `yyyy-MM-dd HH:mm`. */
  scheduledOn: string;
  endsOn: string;
  campaignId: string;
  agenda: string;
}

export interface SiteVisitRecord {
  id: string;
  status: string;
  scheduledOn: string;
  conductedOn: string;
  projectId: string;
  campaignId: string;
  campaignName: string;
  agenda: string;
  notes: string;
  typeId: string;
}

interface ActivityRow {
  site_visit?: {
    _id?: string;
    status?: string;
    scheduled_on?: string;
    conducted_on?: string;
    project_id?: string;
    agenda?: string;
    notes?: string;
    sitevisit_type?: string;
    campaign_info?: { id?: string; name?: string };
  };
}

/**
 * Site visits the way the app does them: v3 JSON with the signed-in user's JWT
 * (`V3::Leads::SiteVisits::Create`, `V3::SiteVisits::UpdateStatus`).
 * Reading them back uses the full-access key on the legacy activities feed.
 */
export class SiteVisitsApi {
  private readonly v3 = new HttpClient(settings.v3ApiBaseUrl);
  private readonly legacy = new HttpClient(settings.apiBaseUrl);

  constructor(private readonly accessToken = "") {}

  /** `POST /api/v3/client/leads/:id/site_visits`. */
  async schedule(leadId: string, input: ScheduleSiteVisitInput): Promise<string> {
    const { body } = await this.v3.post<{ site_visit?: { _id?: string } }>(
      `/api/v3/client/leads/${leadId}/site_visits`,
      { headers: this.authHeaders(), json: { site_visit: this.payload(input) } },
    );
    const id = body.site_visit?._id;
    if (!id) throw new Error("Site visit create returned no id");
    return id;
  }

  /**
   * `PATCH /api/v3/client/site_visits/:id/status`.
   * "Not interested" in the app is the status `dropped`.
   */
  async setStatus(siteVisitId: string, status: "conducted" | "dropped", conductedOn?: string): Promise<void> {
    await this.v3.patch(`/api/v3/client/site_visits/${siteVisitId}/status`, {
      headers: this.authHeaders(),
      json: { site_visit: { status, ...(conductedOn ? { conducted_on: conductedOn } : {}) } },
    });
  }

  /** `PATCH /api/v3/client/site_visits/:id` - keeps the visit `scheduled` at a new time. */
  async reschedule(siteVisitId: string, scheduledOn: string, endsOn: string): Promise<void> {
    await this.v3.patch(`/api/v3/client/site_visits/${siteVisitId}`, {
      headers: this.authHeaders(),
      json: { site_visit: { scheduled_on: scheduledOn, ends_on: endsOn } },
    });
  }

  /**
   * `GET /api/v3/client/leads/:id/site_visits/new`.
   * The Add site visit form lists these projects and types, which are not the
   * same rows as `/client/projects/data_provider.json`.
   */
  async screenDefaults(leadId: string): Promise<{ project: { id: string; text: string }; type: { id: string; text: string } }> {
    const { body } = await this.v3.get<{
      options?: { projects?: { value?: string; label?: string }[]; sitevisit_types?: { value?: string; label?: string }[] };
    }>(`/api/v3/client/leads/${leadId}/site_visits/new`, { headers: this.authHeaders() });
    const project = body.options?.projects?.find((row) => row.value && row.label);
    const type = body.options?.sitevisit_types?.find((row) => row.value && row.label);
    if (!project?.value || !project.label || !type?.value || !type.label) {
      throw new Error(`Site visit form for lead ${leadId} returned no project or type`);
    }
    return { project: { id: project.value, text: project.label }, type: { id: type.value, text: type.label } };
  }

  /** `GET /client/leads/:id/activities.json?filters[_type]=SiteVisit` (Client::Leads::ActivitiesController). */
  async listForLead(leadId: string): Promise<SiteVisitRecord[]> {
    const { body } = await this.legacy.get<{ results?: ActivityRow[] }>(`/client/leads/${leadId}/activities.json`, {
      query: {
        api_key: settings.credentials.fullAccessApiKey,
        client_id: settings.credentials.clientId,
        "filters[_type]": "SiteVisit",
        page: 1,
        per_page: 50,
      },
    });
    return (body.results ?? []).flatMap((row) => {
      const visit = row.site_visit;
      if (!visit?._id) return [];
      return [{
        id: visit._id,
        status: visit.status ?? "",
        scheduledOn: visit.scheduled_on ?? "",
        conductedOn: visit.conducted_on ?? "",
        projectId: visit.project_id ?? "",
        campaignId: visit.campaign_info?.id ?? "",
        campaignName: visit.campaign_info?.name ?? "",
        agenda: visit.agenda ?? "",
        notes: visit.notes ?? "",
        typeId: visit.sitevisit_type ?? "",
      }];
    });
  }

  async byAgenda(leadId: string, agenda: string): Promise<SiteVisitRecord> {
    const visits = await this.listForLead(leadId);
    const found = visits.find((visit) => visit.agenda === agenda);
    if (!found) throw new Error(`No site visit with agenda "${agenda}" on lead ${leadId}`);
    return found;
  }

  /** A conducted visit stores the tester's notes. Agenda is the fixed text "customer visited". */
  async byNotes(leadId: string, notes: string): Promise<SiteVisitRecord> {
    const deadline = Date.now() + 60_000;
    for (;;) {
      const visits = await this.listForLead(leadId);
      const found = visits.find((visit) => visit.notes.includes(notes));
      if (found) return found;
      if (Date.now() >= deadline) {
        const seen = visits.map((visit) => `${visit.status}: ${visit.notes}`).join(" | ") || "none";
        throw new Error(`No site visit with notes "${notes}" on lead ${leadId}. Seen: ${seen}`);
      }
      await sleep(3_000);
    }
  }

  private payload(input: ScheduleSiteVisitInput) {
    return {
      project_id: input.projectId,
      sitevisit_type: input.typeId,
      scheduled_on: input.scheduledOn,
      ends_on: input.endsOn,
      confirmed: true,
      pickup: false,
      agenda: input.agenda,
      campaign_info: { id: input.campaignId },
    };
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.accessToken}`, "X-Selldo-Request": "1" };
  }
}
