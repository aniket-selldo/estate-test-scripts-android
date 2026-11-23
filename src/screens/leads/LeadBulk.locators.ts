import { by, xpathLiteral } from "../../core/locators.ts";

/**
 * lib/features/leads/presentation/widgets/lead_bulk_sheet.dart
 * The Stage row is an InkWell whose label is "Stage" (LeadBulkAction.stage).
 */
export const LeadBulkLocators = {
  title: by.a11y("Bulk actions"),
  /** The row, not a stage chip on the list behind the sheet. */
  stage: `//*[@pane-title="Dialog"]//*[@clickable="true" and (@content-desc=${xpathLiteral("Stage")} or .//*[@content-desc=${xpathLiteral("Stage")}])]`,
  /** LeadBulkAction.reassign label "Reassign". */
  reassign: `//*[@pane-title="Dialog"]//*[@clickable="true" and (@content-desc=${xpathLiteral("Reassign")} or .//*[@content-desc=${xpathLiteral("Reassign")}])]`,
} as const;
