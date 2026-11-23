import { by } from "../../core/locators.ts";

/**
 * lib/features/leads/presentation/widgets/lead_more_sheet.dart
 * Debug builds set resource-id `lead.more.<action>` (TestId, button + label).
 */
export const LeadMoreLocators = {
  title: by.a11y("More actions"),
  editLead: by.id("lead.more.edit"),
  reassignLead: by.id("lead.more.reassign"),
  push: by.id("lead.more.push"),
  /** LeadMoreAction.logOfflineCall in lead_more_actions.dart. */
  offlineCall: by.id("lead.more.logOfflineCall"),
  /** LeadMoreAction.conductedSiteVisit. */
  conductedSiteVisit: by.id("lead.more.conductedSiteVisit"),
  /** LeadMoreAction.merge. */
  merge: by.id("lead.more.merge"),
  /** LeadMoreAction.delete. */
  deleteLead: by.id("lead.more.delete"),
} as const;
