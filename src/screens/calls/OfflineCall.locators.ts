import { by } from "../../core/locators.ts";

/** lib/features/conversations/presentation/screens/offline_call_create_screen.dart */
export const OfflineCallLocators = {
  title: by.a11y("Log offline call"),
  direction: by.formField("Direction"),
  status: by.formField("Status"),
  when: by.formField("When (date & time)"),
  duration: by.textField("Duration"),
  unit: by.formField("Duration unit"),
  note: by.textField("Note"),
  save: by.clickable("Save"),
  savedSnackbar: by.a11yContains("Call details added successfully"),
} as const;
