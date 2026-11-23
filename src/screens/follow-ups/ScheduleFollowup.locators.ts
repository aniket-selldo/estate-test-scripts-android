import { by } from "../../core/locators.ts";

/** lib/features/conversations/presentation/screens/followup_create_screen.dart */
export const ScheduleFollowupLocators = {
  title: by.a11y("Add follow-up"),
  scheduleOn: by.formField("Schedule on (date & time)"), // Key('followup-schedule')
  timeZone: by.formField("Lead's timezone"),
  followupType: by.formField("Followup type"), // Key('followup-type')
  subject: by.textField("Subject"),
  agenda: by.textField("Agenda"),
  /** Required custom fields use the label the form API returns. */
  customField: (label: string) => by.textField(label),
  schedule: by.clickable("Schedule"), // Key('followup-save'), saveLabel
} as const;
