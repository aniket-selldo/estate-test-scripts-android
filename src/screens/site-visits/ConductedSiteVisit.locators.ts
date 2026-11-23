import { by } from "../../core/locators.ts";

/** lib/features/conversations/presentation/screens/conducted_site_visit_screen.dart */
export const ConductedSiteVisitLocators = {
  title: by.a11y("Add conducted site visit"),
  project: by.formField("Project"),
  siteVisitType: by.formField("Site visit type"),
  conductedOn: by.formField("Conducted on"),
  notes: by.textField("Notes"),
  campaign: by.formField("Campaign"),
  save: by.clickable("Save"),
  savedSnackbar: by.a11yContains("conducted successfully"),
} as const;
