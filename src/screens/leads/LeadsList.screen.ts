import { driver } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { LeadColumnsSheet } from "./LeadColumns.screen.ts";
import { LeadSearchSheet } from "./LeadSearch.screen.ts";
import { LeadsListLocators as L } from "./LeadsList.locators.ts";

export class LeadsListScreen extends BaseScreen {
  protected readonly name = "Leads list";
  protected readonly trait = L.filter;

  async openColumns(): Promise<LeadColumnsSheet> {
    return step("Open lead columns", async () => {
      await this.waitUntilShown();
      await this.tap(L.columns);
      return new LeadColumnsSheet().waitUntilShown();
    });
  }

  /** Labels on the cards currently on screen. */
  async shownText(): Promise<string> {
    await this.waitUntilShown();
    return (await this.visibleLabels()).join("\n");
  }

  async search(query: string): Promise<void> {
    await step(`Search leads for "${query}"`, async () => {
      await this.waitUntilShown();
      const sheet = new LeadSearchSheet();
      const deadline = Date.now() + this.timeout;
      // Closing the columns sheet can swallow the first tap on Search.
      while (!(await sheet.isShown())) {
        if (Date.now() >= deadline) break;
        await this.tap(L.search);
        await driver.waitUntil(async () => sheet.isShown(), { timeout: 3_000 }).catch(() => false);
      }
      await sheet.submit(query);
    });
  }
}
