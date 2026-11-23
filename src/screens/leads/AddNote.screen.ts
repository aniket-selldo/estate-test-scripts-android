import { $, driver } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { snackbarText, watchSave, type SaveOutcome } from "../components/formSave.ts";
import { AddNoteLocators as L } from "./AddNote.locators.ts";

/** Add-note sheet. The lead is fixed when the sheet is opened from the lead. */
export class AddNoteSheet extends BaseScreen {
  protected readonly name = "Add note";
  protected readonly trait = L.title;
  protected readonly isModal = true;

  async enterNote(note: string): Promise<void> {
    await step("Write the note", async () => {
      const editor = $(L.editor);
      await editor.waitForDisplayed({ timeout: this.timeout, timeoutMsg: `${this.name}: the note editor is not on screen` });
      await editor.click();
      await driver.keys(note.split(""));
      await driver.waitUntil(async () => $(L.save).isEnabled(), {
        timeout: this.timeout,
        timeoutMsg: `${this.name}: Add note stayed disabled after typing. Visible: ${(await this.visibleLabels()).join(" || ")}`,
      });
    });
  }

  async save(): Promise<SaveOutcome> {
    return step("Tap Add note", () =>
      watchSave(
        () => this.tap(L.save),
        () => this.isShown(),
        () => this.visibleLabels(),
        () => snackbarText(L.savedSnackbar),
      ),
    );
  }
}
