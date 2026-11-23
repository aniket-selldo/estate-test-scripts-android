import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { snackbarText, watchSave, type SaveOutcome } from "../components/formSave.ts";
import { DeleteLeadLocators as L } from "./DeleteLead.locators.ts";

/**
 * Confirms deleting the open lead.
 * "Delete only" skips the CSV export so the delete is not waiting on an email.
 */
export class DeleteLeadSheet extends BaseScreen {
  protected readonly name = "Confirm lead deletion";
  protected readonly trait = L.title;
  protected readonly isModal = true;

  async prompt(): Promise<string> {
    return (await this.visibleLabels()).join("\n");
  }

  async deleteOnly(): Promise<SaveOutcome> {
    return step("Confirm Delete only", async () => {
      await this.tap(L.deleteOnly);
      return watchSave(
        () => this.tap(L.confirm),
        () => this.isShown(),
        () => this.visibleLabels(),
        () => snackbarText(L.savedSnackbar),
      );
    });
  }
}
