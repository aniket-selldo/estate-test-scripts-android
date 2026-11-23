import { by, xpathLiteral } from "../../core/locators.ts";

/**
 * Single-select bottom sheet (lib/core/widgets/form).
 * Lookups show a Search field. Choice sheets on this build do not: each row is
 * resource-id `form.option` with the label as content-desc (form_choice_sheet.dart).
 */
const label = (text: string): string =>
  `translate(@content-desc, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz")=${xpathLiteral(text.toLowerCase())}`;

export const PickerSheetLocators = {
  /** One node for the open sheet. Choice rows repeat, so they cannot be the trait. */
  trait: '//*[@pane-title="Dialog"]',
  search: by.textField("Search"),
  /** Every row in a choice sheet (form_choice_sheet.dart sets resource-id `form.option`). */
  choiceRows: '//*[@resource-id="form.option"]',
  /** FormChoiceDone. The button text is "Done". */
  done: by.clickable("Done"),
  /** The row itself, not a same-named chip on the screen behind the sheet. */
  choice: (text: string) => `//*[@resource-id="form.option" and ${label(text)}]`,
  /** A lookup row. Lookups have a Search field and no `form.option` id. */
  lookup: (text: string) => `//*[@clickable="true" and ${label(text)}]`,
} as const;
