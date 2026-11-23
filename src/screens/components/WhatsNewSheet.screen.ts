import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { WhatsNewSheetLocators as L } from "./WhatsNewSheet.locators.ts";

export class WhatsNewSheet extends BaseScreen {
  protected readonly name = "What's New sheet";
  protected readonly trait = L.title;
  protected readonly isModal = true;

  async dismiss(): Promise<void> {
    await step("Dismiss the What's New sheet", async () => {
      await this.tap(L.ok);
      await this.waitUntilGone();
    });
  }
}
