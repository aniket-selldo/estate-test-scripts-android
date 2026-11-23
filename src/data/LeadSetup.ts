import { faker } from "@faker-js/faker";
import { currentProjectIds, LeadsApi } from "../api/LeadsApi.ts";
import { UserRole, UsersApi, type SellDoUser } from "../api/UsersApi.ts";
import type { ProviderOption } from "../api/ClientConfigApi.ts";
import { attachJson } from "../core/reporting.ts";
import { ClientConfigData } from "./ClientConfigData.ts";
import { LeadFactory, type LeadData } from "./LeadFactory.ts";

export interface ArrangedLead {
  salesUser: SellDoUser;
  campaign: ProviderOption;
  project: ProviderOption;
  siteVisitType: ProviderOption;
  lead: LeadData;
  /** Mongo id, used by the site visit routes. */
  leadId: string;
}

export interface OwnedLead {
  lead: LeadData;
  leadId: string;
  /** Stage type from retrieve_lead, usually `incoming` for a new lead. */
  stage: string;
  projectIds: string[];
}

/** A lead assigned to `user`. Pass `projectId` when the case needs an interested project. */
export async function createOwnedLead(user: SellDoUser, projectId = ""): Promise<OwnedLead> {
  const campaign = await ClientConfigData.campaignForAddLead();
  const lead = LeadFactory.build();
  await new LeadsApi().create({
    name: `${lead.firstName} ${lead.lastName}`,
    email: lead.email,
    phone: lead.phone,
    campaignId: campaign.id,
    salesId: user._id,
    projectIds: projectId ? [projectId] : undefined,
  });
  const saved = await new LeadsApi().retrieveWhenExists(lead.email);
  const leadId = saved.lead?.id ?? "";
  if (!leadId) throw new Error(`Created lead ${lead.email} has no id`);
  const owned = {
    lead,
    leadId,
    stage: String(saved.lead?.stage ?? ""),
    projectIds: currentProjectIds(saved.lead),
  };
  attachJson("Owned lead", { user: user.email, ...owned });
  return owned;
}

/**
 * At least five new leads that share one last name, so a lead-list search
 * returns only this set. List search matches a name by regex; an email matches
 * only when the query is the whole address. A new lead is incoming. Bulk stage
 * change skips a lead whose stage does not change, so the bulk target must not
 * be incoming.
 */
export async function createIncomingLeads(
  user: SellDoUser,
  count: number,
): Promise<{ query: string; leads: OwnedLead[] }> {
  const query = `Stage${faker.string.alpha({ length: 10 })}`;
  const campaign = await ClientConfigData.campaignForAddLead();
  const api = new LeadsApi();
  const leads: OwnedLead[] = [];
  for (let created = 0; created < count; created += 1) {
    const lead = LeadFactory.build({ lastName: query });
    await api.create({
      name: `${lead.firstName} ${lead.lastName}`,
      email: lead.email,
      phone: lead.phone,
      campaignId: campaign.id,
      salesId: user._id,
    });
    const saved = await api.retrieveWhenExists(lead.email);
    const leadId = saved.lead?.id ?? "";
    if (!leadId) throw new Error(`Created lead ${lead.email} has no id`);
    const stageData = saved.lead?.stage_data as { id?: string } | undefined;
    const stage = stageData?.id ?? String(saved.lead?.stage ?? "");
    if (stage !== "incoming") {
      throw new Error(`New lead ${lead.email} is "${stage}". Bulk stage change starts from incoming.`);
    }
    leads.push({ lead, leadId, stage, projectIds: currentProjectIds(saved.lead) });
  }
  attachJson("Incoming leads", { user: user.email, query, count: leads.length, leads });
  return { query, leads };
}

/** An active sales user and a lead assigned to them, with the client's campaign, project and visit type. */
export async function createLeadForSalesUser(): Promise<ArrangedLead> {
  const salesUser = await new UsersApi().firstActiveUser(UserRole.Sales);
  const campaign = await ClientConfigData.campaignForAddLead();
  const project = await ClientConfigData.firstProject();
  const siteVisitType = await ClientConfigData.firstSiteVisitType();
  const lead = LeadFactory.build();
  await new LeadsApi().create({
    name: `${lead.firstName} ${lead.lastName}`,
    email: lead.email,
    phone: lead.phone,
    campaignId: campaign.id,
    salesId: salesUser._id,
  });
  const saved = await new LeadsApi().retrieveWhenExists(lead.email);
  const leadId = saved.lead?.id ?? "";
  if (!leadId) throw new Error(`Created lead ${lead.email} has no id`);
  const arranged = { salesUser, campaign, project, siteVisitType, lead, leadId };
  attachJson("Arranged lead", { salesUser: salesUser.email, campaign, project, siteVisitType, lead, leadId });
  return arranged;
}
