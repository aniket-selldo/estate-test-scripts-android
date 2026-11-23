import { by } from "../../core/locators.ts";

/**
 * lib/features/leads/presentation/screens/lead_form_screen.dart
 * Dart Keys (not visible to UiAutomator2) noted for when the app adds Semantics identifiers.
 */
export const AddLeadLocators = {
  pickPhoneContact: by.a11y("Pick a phone contact"), // AppBar action, only while creating
  mandatoryFilter: by.a11y("Mandatory fields"),
  mandatoryFilterBanner: by.a11yPrefix("* Showing important and mandatory fields only"),
  firstName: by.textField("First name"), // Key('lead-first-name')
  lastName: by.textField("Last name"), // Key('lead-last-name')
  email: by.textField("Primary email"), // Key('lead-email')
  phone: by.textField("Primary phone"), // Key('lead-phone')
  campaign: by.formField("Campaign"), // Key('lead-campaign')
  leadStage: by.formField("Lead stage"), // Key('lead-stage')
  save: by.a11y("Save"), // Key('lead-save')
  /** lib/features/leads/data/lead_form.dart `leadSaveMessage`: "Lead created successfully" unless the server sends `message`. */
  savedSnackbar: by.a11yContains("successfully"),
} as const;
