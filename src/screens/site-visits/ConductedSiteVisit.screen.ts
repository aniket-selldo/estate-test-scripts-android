import { $, driver } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { snackbarText, watchSave, type SaveOutcome } from "../components/formSave.ts";
import { MaterialDateTimeDialog } from "../components/MaterialDateTime.screen.ts";
import { PickerSheet } from "../components/PickerSheet.screen.ts";
import { PickerSheetLocators } from "../components/PickerSheet.locators.ts";
import { ConductedSiteVisitLocators as L } from "./ConductedSiteVisit.locators.ts";

/** Logs a site visit that already happened. The visit time has to be in the past. */
export class ConductedSiteVisitScreen extends BaseScreen {
  protected readonly name = "Add conducted site visit";
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

  async setConductedOn(when: Date): Promise<void> {
    await step(`Set conducted on to ${when.toLocaleString("en-IN")}`, async () => {
      await this.scrollTo(L.conductedOn);
      await this.tap(L.conductedOn);
      await new MaterialDateTimeDialog().pick(when);
    });
  }

  async enterNotes(notes: string): Promise<void> {
    await step("Enter the site visit notes", () => this.type(L.notes, notes));
  }

  async shownProject(): Promise<string> {
    return this.dropdownValue(L.project);
  }

  async shownCampaign(): Promise<string> {
    return this.dropdownValue(L.campaign);
  }

  async save(): Promise<SaveOutcome> {
    return step("Tap Save", () =>
      watchSave(
        async () => {
          await this.scrollTo(L.save);
          await this.tap(L.save);
        },
        () => this.isShown(),
        () => this.visibleLabels(),
        () => snackbarText(L.savedSnackbar),
      ),
    );
  }

  /**
   * The project list arrives from the site-visit form request after the screen
   * is already open. A tap before that request finishes shows "No projects found"
   * and leaves the field empty, so this waits until the choice sheet is actually open.
   */
  private async choose(field: string, sheetName: string, option: string): Promise<void> {
    await step(`Select ${sheetName.toLowerCase()} "${option}"`, async () => {
      const sheet = $(PickerSheetLocators.trait);
      const deadline = Date.now() + this.timeout;
      while (!(await sheet.isDisplayed())) {
        if (Date.now() >= deadline) {
          throw new Error(`${this.name}: ${sheetName} picker did not open. Visible: ${(await this.visibleLabels()).join(" || ")}`);
        }
        await this.scrollTo(field);
        await this.tap(field);
        await driver.waitUntil(async () => sheet.isDisplayed(), { timeout: 2_000 }).catch(() => false);
      }
      await new PickerSheet(`${sheetName} picker`).select(option);
      await $(field).waitForDisplayed({ timeout: this.timeout });
    });
  }

  private async dropdownValue(field: string): Promise<string> {
    await this.scrollTo(field);
    const desc = (await $(field).getAttribute("content-desc")) ?? "";
    return desc.split("\n").slice(1).join("\n").trim();
  }
}
