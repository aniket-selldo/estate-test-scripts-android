import { by } from "../../core/locators.ts";

/**
 * lib/features/leads/presentation/screens/lead_form_screen.dart
 * The same form as Add lead, opened with title "Edit lead".
 * Dart Keys are not visible to UiAutomator2.
 */
export const EditLeadLocators = {
  /** AppBar title while editing. */
  title: by.a11y("Edit lead"),
  mandatoryFilter: by.a11y("Mandatory fields"),
  mandatoryFilterBanner: by.a11yPrefix("* Showing important and mandatory fields only"),
  salutation: by.formField("Salutation"), // Key('lead-salutation')
  firstName: by.textField("First name"), // Key('lead-first-name')
  lastName: by.textField("Last name"), // Key('lead-last-name')
  addEmail: by.a11y("Add email"), // Key('lead-add-email')
  secondaryEmail: by.textField("Secondary email"),
  addPhone: by.a11y("Add phone"), // Key('lead-add-phone')
  secondaryPhone: by.textField("Secondary phone"),
  save: by.a11y("Save"), // Key('lead-save')
  /** lead_form.dart `leadSaveMessage`: "Lead updated successfully" unless the server sends `message`. */
  savedSnackbar: by.a11yContains("success"),
} as const;
