import { $ } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { snackbarText, watchSave, type SaveOutcome } from "../components/formSave.ts";
import { PickerSheet } from "../components/PickerSheet.screen.ts";
import { EditLeadLocators as L } from "./EditLead.locators.ts";

export interface LeadEdits {
  firstName: string;
  lastName: string;
  salutation: string;
  secondaryEmail: string;
  secondaryPhone: string;
}

export class EditLeadScreen extends BaseScreen {
  protected readonly name = "Edit lead";
  protected readonly trait = L.title;

  async updateProfile(edits: LeadEdits): Promise<void> {
    await step("Update name, salutation, secondary email and secondary phone", async () => {
      if (await $(L.mandatoryFilterBanner).isDisplayed()) await this.tap(L.mandatoryFilter);
      await this.type(L.firstName, edits.firstName);
      await this.type(L.lastName, edits.lastName);
      await this.pick(L.salutation, "Salutation", edits.salutation);
      await this.scrollTo(L.addEmail);
      await this.tap(L.addEmail);
      await this.type(L.secondaryEmail, edits.secondaryEmail);
      await this.scrollTo(L.addPhone);
      await this.tap(L.addPhone);
      await this.type(L.secondaryPhone, edits.secondaryPhone);
      await this.hideKeyboard();
    });
  }

  async shownSalutation(): Promise<string> {
    return this.dropdownValue(L.salutation);
  }

  async save(): Promise<SaveOutcome> {
    return step("Tap Save", () =>
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

  private async dropdownValue(field: string): Promise<string> {
    await this.scrollTo(field);
    const desc = (await $(field).getAttribute("content-desc")) ?? "";
    return desc.split("\n").slice(1).join("\n").trim();
  }
}
