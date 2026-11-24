import { by } from "../../core/locators.ts";

/**
 * lib/features/conversations/presentation/screens/email_reply_screen.dart
 * Reply and Reply all share this screen. The app bar is "Compose Email".
 * Email type and To are read-only. CC and BCC are text fields.
 * Subject is required ("Subject *"). The body is the shared rich-text editor
 * (`form.note`). Save is resource-id `form.submit`, label "Send Email".
 * The screen has no template picker. Send email is the screen that applies one.
 */
export const ReplyEmailLocators = {
  /**
   * Read-only Email type and To are `android.view.View`, not EditText.
   * Their value is the `text` attribute. Resource-id is `form.field.<slug>`.
   */
  subject: by.id("form.field.subject"),
  emailType: by.id("form.field.email-type"),
  to: by.id("form.field.to"),
  cc: by.id("form.field.cc"),
  bcc: by.id("form.field.bcc"),
  /** The rich-text editor inside `form.note`. Placeholder text is "Body". */
  body: by.id("editor"),
  /** The clickable button. `form.submit` itself is not clickable. */
  save: by.clickable("Send Email"),
} as const;
