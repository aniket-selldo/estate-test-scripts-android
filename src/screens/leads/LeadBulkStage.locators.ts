import { by } from "../../core/locators.ts";

/**
 * lib/features/leads/presentation/widgets/lead_stage_sheet.dart
 * "Currently in" is the pipeline. The primary button repeats the title "Change stage".
 * Notice from V3::Leads::BulkStageChange::NOTICE.
 */
export const LeadBulkStageLocators = {
  currentlyIn: by.formField("Currently in"),
  stage: by.formField("Stage"),
  status: by.formField("Status"),
  reason: by.formField("Stage change reason"),
  save: by.clickable("Change stage"),
  startedSnackbar: by.a11yContains("Bulk Lead Stage Change started in background"),
} as const;
