import { $ } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { snackbarText, watchSave, type SaveOutcome } from "../components/formSave.ts";
import { PickerSheet } from "../components/PickerSheet.screen.ts";
import { MergeLeadLocators as L } from "./MergeLead.locators.ts";

/** Merge another lead into the one that is open. Conflict dropdowns keep the current lead by default. */
export class MergeLeadScreen extends BaseScreen {
  protected readonly name = "Merge lead";
  protected readonly trait = L.title;

  async chooseLead(name: string): Promise<void> {
    await step(`Choose "${name}" as the lead to merge`, async () => {
      await this.scrollTo(L.leadToMerge);
      await this.tap(L.leadToMerge);
      await new PickerSheet("Lead to merge").chooseMatch(name);
      await $(L.leadToMerge).waitForDisplayed({ timeout: this.timeout });
    });
  }

  async shownLeadToMerge(): Promise<string> {
    await this.scrollTo(L.leadToMerge);
    const desc = (await $(L.leadToMerge).getAttribute("content-desc")) ?? "";
    return desc.split("\n").slice(1).join("\n").trim();
  }

  async enterNotes(notes: string): Promise<void> {
    await step("Enter the merge notes", () => this.type(L.notes, notes));
  }

  async merge(): Promise<SaveOutcome> {
    return step("Tap Merge", () =>
      watchSave(
        () => this.tap(L.merge),
        () => this.isShown(),
        () => this.visibleLabels(),
        () => snackbarText(L.savedSnackbar),
      ),
    );
  }
}
