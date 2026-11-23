import { ClientConfigApi, type ProviderOption } from "../api/ClientConfigApi.ts";
import { attachJson } from "../core/reporting.ts";

/**
 * Campaigns the Add lead form cannot save without extra data (lead_form.dart `validate`):
 * walk-in needs a site visit (project, date, time); channel partner needs a partner.
 */
const CAMPAIGNS_NEEDING_EXTRA_DATA = /walk-?in|channel partner/i;

/** Deterministic picks from the client's configuration, attached to the report. */
export const ClientConfigData = {
  /** First campaign in provider order that the form can save with contact data only. */
  async campaignForAddLead(): Promise<ProviderOption> {
    const options = await new ClientConfigApi().campaigns();
    const pick = options.find((c) => !CAMPAIGNS_NEEDING_EXTRA_DATA.test(c.text));
    if (!pick) throw new Error("No campaign that can be saved without site-visit or partner data");
    attachJson("Picked campaign", pick);
    return pick;
  },

  /** First project in provider order. */
  async firstProject(): Promise<ProviderOption> {
    const [pick] = await new ClientConfigApi().projects();
    attachJson("Picked project", pick);
    return pick;
  },

  /** Up to `count` projects. A lead can have one visit per project at the same minute. */
  async projects(count: number): Promise<ProviderOption[]> {
    const options = await new ClientConfigApi().projects();
    const pick = options.slice(0, count);
    attachJson("Picked projects", pick);
    return pick;
  },

  /** First site visit type in provider order ("Visit" on this client). */
  async firstSiteVisitType(): Promise<ProviderOption> {
    const [pick] = await new ClientConfigApi().siteVisitTypes();
    attachJson("Picked site visit type", pick);
    return pick;
  },

  /** First sales stage in provider order (the entry stage of the sales pipeline). */
  async firstSalesStage(): Promise<ProviderOption> {
    const [pick] = await new ClientConfigApi().salesStages();
    attachJson("Picked sales stage", pick);
    return pick;
  },
};
