import { by } from "../../core/locators.ts";

/**
 * lib/features/conversations/presentation/screens/email_create_screen.dart
 * App bar title and the save label are both "Send email" for a general email.
 * The subject field is the one node that belongs only to this screen.
 * Key('email-subject') is not visible to UiAutomator2. The label is "Subject".
 * The body is the shared rich-text editor, resource-id `form.note` (rich_note_field.dart).
 * Save is resource-id `form.submit` (form_chrome.dart). Key('email-save') is not visible.
 */
export const SendEmailLocators = {
  subject: by.textField("Subject"),
  /** AppFormField.dropdown label "Email type". The default value is "General email". */
  emailType: by.formField("Email type"),
  /** AppFormField.dropdown label "Template". Choosing one fills the subject and body. */
  template: by.formField("Template"),
  /** AppFormField.dropdown label "To". The lead's primary address is already selected. */
  to: by.formField("To"),
  /** RichNoteField placeholder "Body". Debug builds set resource-id `form.note`. */
  body: by.id("form.note"),
  save: by.id("form.submit"),
  /** EmailKind.general.successMessage, shown after the screen closes. */
  sentSnackbar: by.a11yContains("Email sent successfully"),
} as const;
