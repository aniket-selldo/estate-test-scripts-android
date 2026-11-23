import { $ } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { normalize } from "../../core/normalize.ts";
import { step } from "../../core/reporting.ts";
import { snackbarText, watchSave, type SaveOutcome } from "../components/formSave.ts";
import { PickerSheet } from "../components/PickerSheet.screen.ts";
import { LeadBulkReassignLocators as L } from "./LeadBulkReassign.locators.ts";

export interface BulkReassignChoice {
  strategy: "team" | "project";
  group: string;
  /** One person. Simple reassignment sends every selected lead to this user. */
  user: string;
}

/**
 * Bulk reassign. Simple reassignment is a round robin of the chosen people,
 * so the sheet is given one person and every selected lead goes to them.
 * The current owner is not that person: shuffle skips the current owner, and
 * simple reassignment skips a lead already assigned to a chosen person.
 */
export class LeadBulkReassignSheet extends BaseScreen {
  protected readonly name = "Reassign leads";
  protected readonly trait = L.title;
  protected readonly isModal = true;

  async reassign(choice: BulkReassignChoice): Promise<SaveOutcome> {
    const groupField = choice.strategy === "project" ? L.project : L.team;
    const groupLabel = choice.strategy === "project" ? "Project" : "Team";
    await step(`Bulk reassign through ${groupLabel} "${choice.group}" to "${choice.user}"`, async () => {
      await this.waitUntilShown();
      await this.tap(L.simple);
      if (normalize.caseInsensitive(await this.dropdownValue(groupField)) !== normalize.caseInsensitive(choice.group)) {
        await this.pick(groupField, groupLabel, choice.group);
      }
      await this.pick(L.user, "User", choice.user);
    });
    return step("Tap Reassign", () =>
      watchSave(
        () => this.tap(L.save),
        () => this.isShown(),
        () => this.visibleLabels(),
        () => snackbarText(L.startedSnackbar),
      ),
    );
  }

  private async dropdownValue(field: string): Promise<string> {
    await this.scrollTo(field);
    const desc = (await $(field).getAttribute("content-desc")) ?? "";
    return desc.split("\n").slice(1).join("\n").trim();
  }

  private async pick(field: string, sheetName: string, option: string): Promise<void> {
    await this.scrollTo(field);
    await this.tap(field);
    const picker = new PickerSheet(`${sheetName} picker`);
    await picker.waitUntilShown();
    // Team and User stay open until Done. A single-choice sheet closes on the row tap.
    if (await $("//*[@clickable='true' and @content-desc='Done']").isDisplayed()) await picker.selectAndConfirm(option);
    else await picker.select(option);
    await $(field).waitForDisplayed({ timeout: this.timeout });
  }
}
