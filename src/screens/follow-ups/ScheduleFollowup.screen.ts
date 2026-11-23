import { $ } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { MaterialDateTimeDialog } from "../components/MaterialDateTime.screen.ts";
import { PickerSheet } from "../components/PickerSheet.screen.ts";
import { ScheduleFollowupLocators as L } from "./ScheduleFollowup.locators.ts";

const SAVE_TIMEOUT_MS = 30_000;

export interface ScheduleOutcome {
  formClosed: boolean;
  errors: string[];
}

export class ScheduleFollowupScreen extends BaseScreen {
  protected readonly name = "Add follow-up";
  protected readonly trait = L.title;

  async setWhen(when: Date): Promise<void> {
    await step(`Set the follow-up to ${when.toLocaleString("en-IN")}`, async () => {
      await this.scrollTo(L.scheduleOn);
      await this.tap(L.scheduleOn);
      await new MaterialDateTimeDialog().pick(when);
    });
  }

  async selectType(type: string): Promise<void> {
    await step(`Select follow-up type "${type}"`, async () => {
      await this.scrollTo(L.followupType);
      await this.tap(L.followupType);
      await new PickerSheet("Followup type picker").select(type);
      await $(L.followupType).waitForDisplayed({ timeout: this.timeout });
    });
  }

  async enterSubject(subject: string): Promise<void> {
    await step("Enter the subject", () => this.type(L.subject, subject));
  }

  async enterAgenda(agenda: string): Promise<void> {
    await step("Enter the agenda", () => this.type(L.agenda, agenda));
  }

  /** Text, number and textarea custom fields. A required dropdown is reported instead of skipped. */
  async fillRequired(label: string, type: string, value: string): Promise<void> {
    if (type !== "text" && type !== "textarea" && type !== "number") {
      throw new Error(`Required follow-up field "${label}" is a ${type} control, which this screen does not fill`);
    }
    await step(`Enter required ${label}`, () => this.type(L.customField(label), value));
  }

  async shownWhen(): Promise<string> {
    return this.fieldValue(L.scheduleOn);
  }

  async shownTimeZone(): Promise<string> {
    return this.fieldValue(L.timeZone);
  }

  async shownType(): Promise<string> {
    return this.fieldValue(L.followupType);
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

  private async fieldValue(field: string): Promise<string> {
    await this.scrollTo(field);
    const desc = (await $(field).getAttribute("content-desc")) ?? "";
    return desc.split("\n").slice(1).join("\n").trim();
  }
}
