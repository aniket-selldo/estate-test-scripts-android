import { by } from "../../core/locators.ts";

/**
 * lib/features/leads/presentation/widgets/lead_stage_change_sheet.dart
 * A modal sheet. Save is disabled until the stage (or its status) changes.
 */
export const LeadStageLocators = {
  title: by.a11y("Change stage"),
  stage: by.formField("Stage"),
  status: by.formField("Status"),
  save: by.clickable("Save"),
  /** V3::Leads::StageChange::NOTICE */
  savedSnackbar: by.a11yContains("Lead updated successfully"),
} as const;
