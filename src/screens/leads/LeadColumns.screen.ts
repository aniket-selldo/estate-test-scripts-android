import { $, driver } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { LeadColumnsLocators as L } from "./LeadColumns.locators.ts";

/** Picks the columns drawn on each lead card. Name and stage stay locked. */
export class LeadColumnsSheet extends BaseScreen {
  protected readonly name = "Lead columns";
  protected readonly trait = L.title;
  protected readonly isModal = true;

  async reset(): Promise<void> {
    await step("Reset lead columns to the defaults", async () => {
      await this.tap(L.reset);
      await this.waitUntilGone();
    });
  }

  async addCustomField(label: string, query: string): Promise<void> {
    await step(`Add the custom column "${label}"`, async () => {
      await this.type(L.search, query);
      // The sheet does not shrink for the keyboard, so the result list sits
      // under it. Tapping the title drops the keyboard and leaves the sheet open.
      await this.tap(L.title);
      const row = $(L.item(label));
      await driver.waitUntil(async () => row.isExisting(), {
        timeout: this.timeout,
        timeoutMsg: `${this.name}: "${label}" did not appear after searching "${query}". Visible: ${(await this.visibleLabels()).join(" || ")}`,
      });
      if (!(await row.isDisplayed())) await this.scrollTo(L.item(label));
      await row.click();
    });
  }

  async apply(): Promise<void> {
    await step("Apply the lead columns", async () => {
      await this.tap(L.apply);
      await this.waitUntilGone();
    });
  }
}
