import { $ } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { MaterialDateTimeDialog } from "../components/MaterialDateTime.screen.ts";
import { PickerSheet } from "../components/PickerSheet.screen.ts";
import { ScheduleSiteVisitLocators as L } from "./ScheduleSiteVisit.locators.ts";

const SAVE_TIMEOUT_MS = 30_000;

export interface ScheduleOutcome {
  formClosed: boolean;
  errors: string[];
}

export class ScheduleSiteVisitScreen extends BaseScreen {
  protected readonly name = "Add site visit";
  protected readonly trait = L.title;

  async selectProject(project: string): Promise<void> {
    await this.choose(L.project, "Project", project);
  }

  async selectSiteVisitType(type: string): Promise<void> {
    await this.choose(L.siteVisitType, "Site visit type", type);
  }

  async selectCampaign(campaign: string): Promise<void> {
    await this.choose(L.campaign, "Campaign", campaign);
  }

  async setStarts(when: Date): Promise<void> {
    await this.pickDateTime(L.starts, "start", when);
  }

  async setEnds(when: Date): Promise<void> {
    await this.pickDateTime(L.ends, "end", when);
  }

  async enterAgenda(agenda: string): Promise<void> {
    await step("Enter the agenda", () => this.type(L.agenda, agenda));
  }

  async shownProject(): Promise<string> {
    return this.dropdownValue(L.project);
  }

  async shownCampaign(): Promise<string> {
    return this.dropdownValue(L.campaign);
  }

  async save(): Promise<ScheduleOutcome> {
    return step("Tap Schedule", async () => {
      const before = new Set(await this.visibleLabels());
      const appeared = new Set<string>();
      await this.scrollTo(L.schedule);
      await this.tap(L.schedule);
      const deadline = Date.now() + SAVE_TIMEOUT_MS;
      while (Date.now() < deadline) {
        if (!(await this.isShown())) return { formClosed: true, errors: [] };
        for (const label of await this.visibleLabels()) {
          if (!before.has(label)) appeared.add(label);
        }
      }
      return { formClosed: false, errors: [...appeared] };
    });
  }

  private async choose(field: string, sheetName: string, option: string): Promise<void> {
    await step(`Select ${sheetName.toLowerCase()} "${option}"`, async () => {
      await this.scrollTo(field);
      await this.tap(field);
      await new PickerSheet(`${sheetName} picker`).select(option);
      await $(field).waitForDisplayed({ timeout: this.timeout });
    });
  }

  private async pickDateTime(field: string, which: string, when: Date): Promise<void> {
    await step(`Set the ${which} to ${when.toLocaleString("en-IN")}`, async () => {
      await this.scrollTo(field);
      await this.tap(field);
      await new MaterialDateTimeDialog().pick(when);
    });
  }

  private async dropdownValue(field: string): Promise<string> {
    await this.scrollTo(field);
    const desc = (await $(field).getAttribute("content-desc")) ?? "";
    return desc.split("\n").slice(1).join("\n").trim();
  }
}
