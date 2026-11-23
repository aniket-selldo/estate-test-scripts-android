import { $ } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { normalize } from "../../core/normalize.ts";
import { step } from "../../core/reporting.ts";
import { snackbarText, watchSave, type SaveOutcome } from "../components/formSave.ts";
import { PickerSheet } from "../components/PickerSheet.screen.ts";
import { ReassignLeadLocators as L } from "./ReassignLead.locators.ts";

export interface ReassignChoice {
  strategy: "team" | "project";
  group: string;
  user: string;
  /** Empty when the client has no reassignment reasons. */
  reason: string;
}

export class ReassignLeadScreen extends BaseScreen {
  protected readonly name = "Reassign lead";
  protected readonly trait = L.title;

  async reassign(choice: ReassignChoice): Promise<SaveOutcome> {
    const groupField = choice.strategy === "project" ? L.project : L.team;
    const groupLabel = choice.strategy === "project" ? "Project" : "Team";
    await step(`Reassign through ${groupLabel} "${choice.group}" to "${choice.user}"`, async () => {
      // A sales user with hierarchy on already has their own team filled in, and the field does not open.
      const shown = await this.dropdownValue(groupField);
      if (normalize.caseInsensitive(shown) !== normalize.caseInsensitive(choice.group)) {
        await this.pick(groupField, groupLabel, choice.group);
      }
      await this.pick(L.user, "User", choice.user);
      if (choice.reason) await this.pick(L.reason, "Reassignment reason", choice.reason);
    });
    return step("Tap Reassign", () =>
      watchSave(
        () => this.tap(L.save),
        () => this.isShown(),
        () => this.visibleLabels(),
        () => snackbarText(L.savedSnackbar),
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
    await new PickerSheet(`${sheetName} picker`).select(option);
    await $(field).waitForDisplayed({ timeout: this.timeout });
  }
}
