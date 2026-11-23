import { by } from "../../core/locators.ts";

/** lib/features/conversations/presentation/screens/site_visit_update_screen.dart */
export const UpdateSiteVisitLocators = {
  conductedOn: by.formField("Conducted on"),
  notes: by.textField("Notes"),
  rescheduleOn: by.formField("Schedule on (date & time)"),
  action: (label: string) => by.clickable(label),
} as const;
