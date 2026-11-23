import { by } from "../../core/locators.ts";

/** lib/features/leads/presentation/widgets/lead_search_sheet.dart */
export const LeadSearchLocators = {
  title: by.a11y("Search leads"),
  /**
   * resource-id `list.search.input`. The hint "Name, phone, email, or lead id"
   * is gone once the field has a value, and the sheet keeps the last query.
   */
  query: by.id("list.search.input"),
  search: by.clickable("Search"),
} as const;
