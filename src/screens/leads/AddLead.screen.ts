import { $ } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import type { LeadData } from "../../data/LeadFactory.ts";
import { PickerSheet } from "../components/PickerSheet.screen.ts";
import { AddLeadLocators as L } from "./AddLead.locators.ts";

const SAVE_TIMEOUT_MS = 30_000;
/** The success snackbar is posted on the next frame after the form closes and shows for ~4s. */
const SNACKBAR_TIMEOUT_MS = 5_000;

export interface SaveOutcome {
  formClosed: boolean;
  /** Messages that appeared while the form stayed open (validation or server errors). */
  errors: string[];
  /** Success snackbar text shown after the form closed, or "" if none was seen. */
  successMessage: string;
}

export class AddLeadScreen extends BaseScreen {
  protected readonly name = "Add lead form";
  protected readonly trait = L.pickPhoneContact;

  async enterContact(lead: LeadData): Promise<void> {
    await step("Enter first name, last name, email and phone", async () => {
      await this.showAllFields();
      await this.type(L.firstName, lead.firstName);
      await this.type(L.lastName, lead.lastName);
      await this.type(L.email, lead.email);
      await this.type(L.phone, lead.phone);
      await this.hideKeyboard();
    });
  }

  async selectCampaign(campaign: string): Promise<void> {
    await step(`Select campaign "${campaign}"`, () => this.pick(L.campaign, "Campaign", campaign));
  }

  async selectStage(stage: string): Promise<void> {
    await step(`Select lead stage "${stage}"`, () => this.pick(L.leadStage, "Lead stage", stage));
  }

  /** Value currently shown in the Campaign dropdown. */
  async shownCampaign(): Promise<string> {
    return this.dropdownValue(L.campaign);
  }

  /** Value currently shown in the Lead stage dropdown. */
  async shownStage(): Promise<string> {
    return this.dropdownValue(L.leadStage);
  }

  /**
   * Taps Save and reports what happened. Save pops the form on success (lead_form_screen.dart
   * `_save`); a problem keeps it open and shows a short-lived snackbar, so new labels are
   * collected while waiting.
   */
  async save(): Promise<SaveOutcome> {
    return step("Tap Save", async () => {
      const before = new Set(await this.visibleLabels());
      const appeared = new Set<string>();
      await this.tap(L.save);
      const deadline = Date.now() + SAVE_TIMEOUT_MS;
      while (Date.now() < deadline) {
        if (!(await this.isShown())) {
          return { formClosed: true, errors: [], successMessage: await this.successMessage() };
        }
        for (const label of await this.visibleLabels()) {
          if (!before.has(label)) appeared.add(label);
        }
      }
      return { formClosed: false, errors: [...appeared], successMessage: "" };
    });
  }

  /** The "Mandatory fields" filter hides optional fields such as the name; make sure it is off. */
  private async showAllFields(): Promise<void> {
    if (await $(L.mandatoryFilterBanner).isDisplayed()) await this.tap(L.mandatoryFilter);
  }

  private async pick(field: string, sheetName: string, option: string): Promise<void> {
    await this.scrollTo(field);
    await this.tap(field);
    await new PickerSheet(`${sheetName} picker`).select(option);
    await $(field).waitForDisplayed({ timeout: this.timeout });
  }

  /** Dropdown content-desc is "Label[ *]\nValue". */
  private async dropdownValue(field: string): Promise<string> {
    await this.scrollTo(field);
    const desc = (await $(field).getAttribute("content-desc")) ?? "";
    return desc.split("\n").slice(1).join("\n").trim();
  }

  private async successMessage(): Promise<string> {
    const snackbar = $(L.savedSnackbar);
    const shown = await snackbar.waitForDisplayed({ timeout: SNACKBAR_TIMEOUT_MS }).catch(() => false);
    return shown ? ((await snackbar.getAttribute("content-desc")) ?? "") : "";
  }
}
