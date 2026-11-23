import { $ } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { snackbarText, watchSave, type SaveOutcome } from "../components/formSave.ts";
import { MaterialDateTimeDialog } from "../components/MaterialDateTime.screen.ts";
import { PickerSheet } from "../components/PickerSheet.screen.ts";
import { OfflineCallLocators as L } from "./OfflineCall.locators.ts";

/**
 * Logs a call that happened outside the app.
 * Duration and its unit are on the form only when the status is Answered.
 */
export class OfflineCallScreen extends BaseScreen {
  protected readonly name = "Log offline call";
  protected readonly trait = L.title;

  async selectDirection(direction: "Inbound" | "Outbound"): Promise<void> {
    await this.choose(L.direction, "Direction", direction);
  }

  async selectStatus(status: "Answered" | "Not Answered"): Promise<void> {
    await this.choose(L.status, "Status", status);
  }

  async setWhen(when: Date): Promise<void> {
    await step(`Set the call time to ${when.toLocaleString("en-IN")}`, async () => {
      await this.scrollTo(L.when);
      await this.tap(L.when);
      await new MaterialDateTimeDialog().pick(when);
    });
  }

  async enterDuration(amount: string): Promise<void> {
    await step(`Enter a duration of ${amount}`, () => this.type(L.duration, amount));
  }

  async selectUnit(unit: "Minute(s)" | "Second(s)"): Promise<void> {
    await this.choose(L.unit, "Duration unit", unit);
  }

  async enterNote(note: string): Promise<void> {
    await step("Enter the call note", () => this.type(L.note, note));
  }

  async showsDuration(): Promise<boolean> {
    return $(L.duration).isDisplayed();
  }

  async shownDirection(): Promise<string> {
    return this.dropdownValue(L.direction);
  }

  async shownStatus(): Promise<string> {
    return this.dropdownValue(L.status);
  }

  async shownUnit(): Promise<string> {
    return this.dropdownValue(L.unit);
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

  private async choose(field: string, sheetName: string, option: string): Promise<void> {
    await step(`Select ${sheetName.toLowerCase()} "${option}"`, async () => {
      await this.scrollTo(field);
      await this.tap(field);
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
