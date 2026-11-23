import { $, driver } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { TodaysPerformanceLocators as L } from "./TodaysPerformance.locators.ts";

/** The ten cards, in the order `dashboard_stats.dart` `_performanceFields` paints them. */
export const PERFORMANCE_CARDS = [
  { key: "totalCalls", title: "Total Calls", duration: false },
  { key: "totalTalktime", title: "Total Talktime", duration: true },
  { key: "averageCallDuration", title: "Average Call Duration", duration: true },
  { key: "averageCallbackTime", title: "Average Callback Time", duration: true },
  { key: "timeToFirstContact", title: "Time to First Contact", duration: true },
  { key: "siteVisitsCreated", title: "Site Visits Created", duration: false },
  { key: "siteVisitsScheduled", title: "Site Visits Scheduled", duration: false },
  { key: "siteVisitsConducted", title: "Site Visits Conducted", duration: false },
  { key: "followupsScheduled", title: "Followup Scheduled", duration: false },
  { key: "leadsFromPreSales", title: "Leads from Pre-Sales", duration: false },
] as const;

export type PerformanceCardKey = (typeof PERFORMANCE_CARDS)[number]["key"];

export type PerformanceCards = Record<PerformanceCardKey, number> & { lastUpdated: string };

export class TodaysPerformanceScreen extends BaseScreen {
  protected readonly name = "Today's Performance";
  protected readonly trait = L.totalCalls;

  /** The same Refresh control the app bar uses. Returns when the spinner has gone. */
  async refresh(): Promise<void> {
    return step("Refresh Today's Performance", async () => {
      await this.waitUntilShown();
      await this.tap(L.refresh);
      await driver.waitUntil(async () => !(await $(L.refreshing).isDisplayed().catch(() => false)), {
        timeout: this.timeout,
        interval: 500,
        timeoutMsg: "Today's Performance stayed on Refreshing stats…",
      });
    });
  }

  async readCards(): Promise<PerformanceCards> {
    return step("Read Today's Performance cards", async () => {
      await this.waitUntilShown();
      const cards = {} as Record<PerformanceCardKey, number>;
      for (const card of PERFORMANCE_CARDS) {
        cards[card.key] = await this.metric(card.title, card.duration);
      }
      return { ...cards, lastUpdated: await this.lastUpdated() };
    });
  }

  private async metric(title: string, duration: boolean): Promise<number> {
    const selector = L.card(title);
    await this.scrollTo(selector);
    const label = ((await $(selector).getAttribute("content-desc")) ?? "").trim();
    const prefix = `${title}, `;
    if (!label.startsWith(prefix)) {
      throw new Error(`The "${title}" card label was "${label}"`);
    }
    const value = label.slice(prefix.length).trim();
    if (!duration) {
      if (!/^\d+$/.test(value)) throw new Error(`The "${title}" card shows "${value}", not a count`);
      return Number(value);
    }
    const parts = /^(\d+) min (\d+) sec$/.exec(value);
    if (!parts) throw new Error(`The "${title}" card shows "${value}", not minutes and seconds`);
    return Number(parts[1]) * 60 + Number(parts[2]);
  }

  private async lastUpdated(): Promise<string> {
    await this.scrollTo(L.lastUpdated);
    const desc = ((await $(L.lastUpdated).getAttribute("content-desc")) ?? "").trim();
    return desc || ((await $(L.lastUpdated).getText()) ?? "").trim();
  }
}
