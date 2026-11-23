import { by } from "../../core/locators.ts";

/** lib/features/conversations/presentation/screens/followup_cancel_screen.dart */
export const CancelFollowupLocators = {
  /** The menu item shares the title "Cancel follow-up", so the form is identified by its reason field. */
  reason: by.formField("Cancellation reason"), // Key('followup-cancel-reason')
  note: by.textField("Note"),
  /** Left unchecked: checking it would also schedule a replacement follow-up. */
  scheduleAnother: by.a11y("Schedule followup"),
  confirm: by.clickable("Cancel follow-up"), // Key('followup-cancel'), saveLabel
} as const;
