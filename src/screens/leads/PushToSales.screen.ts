import { $ } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { snackbarText, watchSave, type SaveOutcome } from "../components/formSave.ts";
import { PickerSheet } from "../components/PickerSheet.screen.ts";
import { PushToSalesLocators as L } from "./PushToSales.locators.ts";

export interface PushChoice {
  byProject: boolean;
  group: string;
  /** Empty when auto-forward assigns the sales person. */
  salesPerson: string;
}

export class PushToSalesScreen extends BaseScreen {
  protected readonly name = "Push to sales";
  protected readonly trait = L.title;

  async push(choice: PushChoice): Promise<SaveOutcome> {
    const groupField = choice.byProject ? L.project : L.team;
    const groupLabel = choice.byProject ? "Project" : "Team";
    await step(`Push to sales through ${groupLabel} "${choice.group}"`, async () => {
      await this.pick(groupField, groupLabel, choice.group);
      if (choice.salesPerson) await this.pick(L.salesPerson, "Sales person", choice.salesPerson);
    });
    return step("Tap Push to sales", () =>
      watchSave(
        () => this.tap(L.save),
        () => this.isShown(),
        () => this.visibleLabels(),
        () => snackbarText(L.savedSnackbar),
      ),
    );
  }

  private async pick(field: string, sheetName: string, option: string): Promise<void> {
    await this.scrollTo(field);
    await this.tap(field);
    await new PickerSheet(`${sheetName} picker`).select(option);
    await $(field).waitForDisplayed({ timeout: this.timeout });
  }
}
