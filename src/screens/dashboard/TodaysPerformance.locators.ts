import { by } from "../../core/locators.ts";

/**
 * Today's Performance cards.
 * lib/features/dashboard/presentation/widgets/performance_card.dart
 *   Semantics label is "${title}, ${value}" (`0 min 0 sec` for a duration).
 * lib/features/dashboard/presentation/widgets/accessible_leads_button.dart
 *   Refresh tooltip, and "Refreshing stats…" while a recompute is on screen.
 * lib/features/dashboard/presentation/stat_format.dart
 *   "Last updated on MMM dd, yyyy" plus the clock time.
 */
export const TodaysPerformanceLocators = {
  /** Present only on this tab. Stats uses different tiles. */
  totalCalls: by.a11yPrefix("Total Calls, "),
  refresh: by.a11y("Refresh"),
  refreshing: by.a11y("Refreshing stats…"),
  lastUpdated: by.a11yPrefix("Last updated on "),
  card: (title: string) => by.a11yPrefix(`${title}, `),
} as const;
