import { by } from "../../core/locators.ts";

/** lib/features/leads/presentation/widgets/leads_action_bar.dart (tooltips) */
export const LeadsListLocators = {
  /** leads_action_bar.dart tooltip "Search", resource-id `list.search`. */
  search: by.id("list.search"),
  filter: by.a11y("Filter"),
  /** leads_action_bar.dart tooltip "Fields", resource-id `list.columns`. */
  columns: by.id("list.columns"),
  /** leads_action_bar.dart tooltip "Bulk", resource-id `list.bulk`. */
  bulk: by.id("list.bulk"),
  /** _LeadSelectionBar in leads_screen.dart. */
  selectAll: by.clickable("Select all"),
  changeStage: by.clickable("Change stage"),
  /** _selectionLabel for LeadBulkAction.reassign. */
  reassign: by.clickable("Reassign"),
  selected: (count: number) => by.a11y(`${count} selected`),
} as const;
