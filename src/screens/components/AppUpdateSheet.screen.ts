import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { AppUpdateSheetLocators as L } from "./AppUpdateSheet.locators.ts";

export class AppUpdateSheet extends BaseScreen {
  protected readonly name = "App update sheet";
  protected readonly trait = L.skipUpdate;
  protected readonly isModal = true;

  async skip(): Promise<void> {
    await step("Skip the optional app update", async () => {
      await this.tap(L.skipUpdate);
      await this.waitUntilGone();
    });
  }
}
