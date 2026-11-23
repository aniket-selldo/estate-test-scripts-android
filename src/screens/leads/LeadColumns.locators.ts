import { by } from "../../core/locators.ts";

/**
 * lib/features/leads/presentation/widgets/lead_column_sheet.dart
 * A row's resource-id is `columns.item.` plus the label slug from test_ids.dart.
 */
export function columnItemId(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `columns.item.${slug}`;
}

export const LeadColumnsLocators = {
  title: by.a11y("Select Lead Properties"),
  search: by.textField("Search"),
  apply: by.id("columns.apply"),
  reset: by.id("columns.reset"),
  item: (label: string) => by.id(columnItemId(label)),
} as const;
