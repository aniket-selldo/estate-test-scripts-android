import { by } from "../../core/locators.ts";

/** lib/features/conversations/presentation/screens/site_visit_create_screen.dart */
export const ScheduleSiteVisitLocators = {
  title: by.a11y("Add site visit"),
  project: by.formField("Project"), // Key('site-visit-project')
  siteVisitType: by.formField("Site visit type"), // Key('site-visit-type')
  starts: by.formField("Schedule on (date & time)"), // Key('site-visit-start-date')
  ends: by.formField("Ends on (date & time)"),
  campaign: by.formField("Campaign"),
  agenda: by.textField("Agenda"),
  schedule: by.clickable("Schedule"), // Key('site-visit-save'), saveLabel
  savedNotice: by.a11yContains("success"),
} as const;
