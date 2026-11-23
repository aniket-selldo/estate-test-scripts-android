import { $ } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { snackbarText, watchSave, type SaveOutcome } from "../components/formSave.ts";
import { PickerSheet } from "../components/PickerSheet.screen.ts";
import { LeadBulkStageLocators as L } from "./LeadBulkStage.locators.ts";

/**
 * Bulk Change stage. The target must differ from the leads' current stage:
 * BulkModifyLeadsStageWorker skips a lead when the stage does not change.
 */
export class LeadBulkStageSheet extends BaseScreen {
  protected readonly name = "Bulk change stage";
  protected readonly trait = L.currentlyIn;
  protected readonly isModal = true;

  async changeTo(pipeline: string, stage: string, status = "", reason = ""): Promise<SaveOutcome> {
    await step(`Bulk change stage to "${stage}"`, async () => {
      await this.waitUntilShown();
      await this.tap(L.currentlyIn);
      await new PickerSheet("Currently in").select(pipeline);
      await this.tap(L.stage);
      await new PickerSheet("Stage picker").select(stage);
      if (status) {
        await $(L.status).waitForDisplayed({ timeout: this.timeout });
        await this.tap(L.status);
        await new PickerSheet("Status picker").select(status);
      }
      if (reason) {
        await $(L.reason).waitForDisplayed({ timeout: this.timeout });
        await this.tap(L.reason);
        await new PickerSheet("Stage change reason").select(reason);
      }
    });
    return step("Tap Change stage", () =>
      watchSave(
        () => this.tap(L.save),
        () => this.isShown(),
        () => this.visibleLabels(),
        () => snackbarText(L.startedSnackbar),
      ),
    );
  }
}
