import { $ } from "@wdio/globals";
import { by } from "../../core/locators.ts";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { snackbarText, watchSave, type SaveOutcome } from "../components/formSave.ts";
import { PickerSheet } from "../components/PickerSheet.screen.ts";
import { LeadStageLocators as L } from "./LeadStage.locators.ts";

export class LeadStageSheet extends BaseScreen {
  protected readonly name = "Change stage";
  protected readonly trait = L.title;
  protected readonly isModal = true;

  /**
   * Picks the stage. When that stage has statuses, also picks the first one:
   * the API rejects a stage that has statuses and no status ("Enter valid status").
   */
  async changeTo(stage: string, status = "", reason = "", confirmChannelPartner = false): Promise<SaveOutcome> {
    await step(`Change the stage to "${stage}"`, async () => {
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
    return step("Tap Save", () =>
      watchSave(
        async () => {
          await this.tap(L.save);
          if (confirmChannelPartner) await $(by.clickable("Continue")).click();
        },
        () => this.isShown(),
        () => this.visibleLabels(),
        () => snackbarText(L.savedSnackbar),
      ),
    );
  }
}
