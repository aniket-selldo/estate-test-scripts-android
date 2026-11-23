import { by } from "../../core/locators.ts";

/** lib/features/dashboard/presentation/widgets/change_log_sheet.dart - once per app version. */
export const WhatsNewSheetLocators = {
  title: by.a11y("What's New"),
  ok: by.a11y("OK"),
} as const;
