import { by } from "../../core/locators.ts";

/**
 * lib/features/leads/presentation/screens/lead_reassign_screen.dart
 * The group label is "Team" or "Project" from `reassign_lead_strategy`.
 */
export const ReassignLeadLocators = {
  title: by.a11y("Reassign lead"),
  team: by.formField("Team"), // Key('lead-reassign-group') when strategy is team
  project: by.formField("Project"), // Key('lead-reassign-group') when strategy is project
  user: by.formField("User"), // Key('lead-reassign-user')
  reason: by.formField("Reassignment reason"), // Key('lead-reassign-reason')
  save: by.a11y("Reassign"), // Key('lead-reassign-save')
  /** `_close` in lead_reassign_screen.dart */
  savedSnackbar: by.a11yContains("Lead reassigned successfully"),
} as const;
