import { by } from "../../core/locators.ts";

/**
 * lib/features/leads/presentation/widgets/lead_reassign_sheet.dart
 * The installed sheet titles the radios "Shuffle reassignment" and
 * "Simple reassignment", then a Team or Project field and a User field.
 * The radio's content-desc also carries the strategy description, so the
 * match is a prefix. Notice from V3::Leads::BulkReassign::NOTICE.
 */
export const LeadBulkReassignLocators = {
  title: by.a11y("Reassign leads"),
  simple: by.clickableContains("Simple reassignment"),
  /** Shown when reassign_lead_strategy is team. Value starts as "Select". */
  team: by.formField("Team"),
  /** Shown when reassign_lead_strategy is project. */
  project: by.formField("Project"),
  user: by.formField("User"),
  save: by.clickable("Reassign"),
  startedSnackbar: by.a11yContains("Bulk Lead Reassign started in background"),
} as const;
