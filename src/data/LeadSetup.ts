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
