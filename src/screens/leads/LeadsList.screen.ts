import { $, driver } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { LeadBulkSheet } from "./LeadBulk.screen.ts";
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

  /**
   * Search results for a query that should match only the leads just created.
   * The list button reads "All leads (5)" (lead_search_list.dart `leadSearchListSubtitle`).
   */
  async waitForSearchResults(names: string[], count: number): Promise<string> {
    return step(`Wait until the search shows ${count} leads`, async () => {
      await this.waitUntilShown();
      const seen = new Set<string>();
      let accumulated = "";
      await driver.waitUntil(
        async () => {
          const text = await this.shownText();
          accumulated += `\n${text}`;
          const lower = text.toLowerCase();
          if (lower.includes(`(${count})`)) seen.add("count");
          for (const name of names) {
            if (lower.includes(name.toLowerCase())) seen.add(name.toLowerCase());
          }
          if (seen.has("count") && names.every((name) => seen.has(name.toLowerCase()))) return true;
          if (seen.has("count")) await this.drag("down");
          return false;
        },
        {
          timeout: this.timeout,
          timeoutMsg: `Search did not show exactly ${count} leads (${names.join(", ")})`,
        },
      );
      return accumulated;
    });
  }

  /** Bulk actions sheet, then the Stage row. The list switches into selection. */
  async openBulkStage(): Promise<void> {
    await step("Choose bulk Stage", async () => {
      await this.waitUntilShown();
      await this.tap(L.bulk);
      const sheet = new LeadBulkSheet();
      await sheet.waitUntilShown();
      await sheet.chooseStage();
    });
  }

  /** The list subtitle after a search, e.g. "All leads (0)". */
  async waitForResultCount(count: number): Promise<string> {
    return step(`Wait until the search count is ${count}`, async () => {
      await this.waitUntilShown();
      await driver.waitUntil(async () => (await this.shownText()).includes(`(${count})`), {
        timeout: this.timeout,
        timeoutMsg: `Search count did not become ${count}`,
      });
      return this.shownText();
    });
  }

  /** Bulk actions sheet, then the Reassign row. The list switches into selection. */
  async openBulkReassign(): Promise<void> {
    await step("Choose bulk Reassign", async () => {
      await this.waitUntilShown();
      await this.tap(L.bulk);
      const sheet = new LeadBulkSheet();
      await sheet.waitUntilShown();
      await sheet.chooseReassign();
    });
  }

  /** Selects every lead the search loaded and opens the bulk Reassign sheet. */
  async selectAllAndReassign(count: number): Promise<string> {
    return step(`Select all ${count} leads`, async () => {
      await this.tap(L.selectAll);
      const selected = $(L.selected(count));
      await selected.waitForDisplayed({
        timeout: this.timeout,
        timeoutMsg: `Expected "${count} selected" after Select all`,
      });
      const label = ((await selected.getAttribute("content-desc")) ?? "").trim();
      await this.tap(L.reassign);
      return label;
    });
  }

  /** Selects every lead the search loaded and opens the bulk Change stage sheet. */
  async selectAllAndChangeStage(count: number): Promise<string> {
    return step(`Select all ${count} leads`, async () => {
      await this.tap(L.selectAll);
      const selected = $(L.selected(count));
      await selected.waitForDisplayed({
        timeout: this.timeout,
        timeoutMsg: `Expected "${count} selected" after Select all`,
      });
      const label = ((await selected.getAttribute("content-desc")) ?? "").trim();
      await this.tap(L.changeStage);
      return label;
    });
  }
}
