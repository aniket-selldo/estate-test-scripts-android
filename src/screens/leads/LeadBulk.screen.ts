import { BaseScreen } from "../../core/BaseScreen.ts";
import { LeadBulkLocators as L } from "./LeadBulk.locators.ts";

/** The bulk-actions sheet. Choosing Stage starts lead selection. */
export class LeadBulkSheet extends BaseScreen {
  protected readonly name = "Bulk actions";
  protected readonly trait = L.title;
  protected readonly isModal = true;

  async chooseStage(): Promise<void> {
    await this.waitUntilShown();
    await this.tap(L.stage);
    await this.waitUntilGone();
  }

  async chooseReassign(): Promise<void> {
    await this.waitUntilShown();
    await this.tap(L.reassign);
    await this.waitUntilGone();
  }
}
