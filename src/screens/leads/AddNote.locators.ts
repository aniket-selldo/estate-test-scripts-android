import { by } from "../../core/locators.ts";

/**
 * lib/features/leads/presentation/screens/note_create_screen.dart
 * The note body is a web editor inside TestId `form.note` (rich_note_field.dart).
 */
export const AddNoteLocators = {
  /**
   * The sheet title and the save button both expose "Add note".
   * The editor is the one node that belongs only to this sheet.
   * Debug builds set resource-id `form.note` (rich_note_field.dart).
   */
  title: by.id("form.note"),
  editor: by.id("form.note"),
  save: by.clickable("Add note"),
  savedSnackbar: by.a11yContains("Note added successfully"),
} as const;
