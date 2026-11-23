import { by } from "../../core/locators.ts";

/** lib/features/leads/presentation/widgets/leads_action_bar.dart (tooltips) */
export const LeadsListLocators = {
  /** leads_action_bar.dart tooltip "Search", resource-id `list.search`. */
  search: by.id("list.search"),
  filter: by.a11y("Filter"),
  /** leads_action_bar.dart tooltip "Fields", resource-id `list.columns`. */
  columns: by.id("list.columns"),
} as const;
