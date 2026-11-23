import { $, driver } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { PickerSheet } from "../components/PickerSheet.screen.ts";
import { CancelFollowupLocators as L } from "./CancelFollowup.locators.ts";

const SAVE_TIMEOUT_MS = 30_000;

export interface CancelOutcome {
  formClosed: boolean;
  errors: string[];
}

export class CancelFollowupScreen extends BaseScreen {
  protected readonly name = "Cancel follow-up";
  protected readonly trait = L.reason;

  async selectReason(reason: string): Promise<void> {
    await step(`Select cancellation reason "${reason}"`, async () => {
      await this.scrollTo(L.reason);
      const before = new Set(await this.visibleLabels());
      await this.tap(L.reason);
      const sheet = new PickerSheet("Cancellation reason picker");
      const deadline = Date.now() + this.timeout;
      while (Date.now() < deadline) {
        if (await sheet.isShown()) {
          await sheet.select(reason);
          await $(L.reason).waitForDisplayed({ timeout: this.timeout });
          return;
        }
        const message = (await this.visibleLabels()).find(
          (label) => !before.has(label) && /forbidden|unable to load|no cancellation reasons/i.test(label),
        );
        if (message) throw new Error(`Cancellation reason list did not open: ${message}`);
      }
      throw new Error("Cancellation reason list did not open, so the required reason could not be filled.");
    });
  }

  async enterNote(note: string): Promise<void> {
    await step("Enter the cancellation note", async () => {
      await this.type(L.note, note);
      if (await driver.isKeyboardShown()) await this.hideKeyboard();
    });
  }

  async shownReason(): Promise<string> {
    await this.scrollTo(L.reason);
    const desc = (await $(L.reason).getAttribute("content-desc")) ?? "";
    return desc.split("\n").slice(1).join("\n").trim();
  }

  async shownNote(): Promise<string> {
    await this.scrollTo(L.note);
    return ((await $(L.note).getText()) ?? "").trim();
  }

  /** Cancels this follow-up only. "Schedule followup" stays unchecked. */
  async confirm(): Promise<CancelOutcome> {
    return step("Tap Cancel follow-up", async () => {
      const before = new Set(await this.visibleLabels());
      const appeared = new Set<string>();
      await this.scrollTo(L.confirm);
      await this.tap(L.confirm);
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
}
