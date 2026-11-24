import { $, driver } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { watchSave, type SaveOutcome } from "../components/formSave.ts";
import { ReplyEmailLocators as L } from "./ReplyEmail.locators.ts";

/** What Reply or Reply all filled in before the user writes the message. */
export interface ReplyPrefill {
  emailType: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
}

/**
 * Reply / Reply all. The subject, To, and (for Reply all) CC come from the
 * incoming email. The body starts empty. The user writes it.
 */
export class ReplyEmailScreen extends BaseScreen {
  protected readonly name = "Compose Email";
  protected readonly trait = L.subject;

  async prefill(): Promise<ReplyPrefill> {
    return step("Read the reply composer", async () => {
      await this.waitUntilShown();
      return {
        emailType: await this.typed(L.emailType, "Email type"),
        to: await this.typed(L.to, "To"),
        cc: await this.typed(L.cc, "CC"),
        bcc: await this.typed(L.bcc, "BCC"),
        subject: await this.typed(L.subject, "Subject"),
      };
    });
  }

  async enterBody(body: string): Promise<void> {
    await step("Write the reply", async () => {
      const editor = $(L.body);
      await this.scrollTo(L.body);
      await editor.waitForDisplayed({ timeout: this.timeout, timeoutMsg: `${this.name}: the body editor is not on screen` });
      await editor.click();
      await driver.keys(body.split(""));
      await this.hideKeyboard();
    });
  }

  /**
   * Lead detail's reply action discards the pop message, so a snackbar is not
   * part of this path. The composer closing is the signal that Send was accepted.
   */
  async save(): Promise<SaveOutcome> {
    return step("Tap Send Email", async () => {
      await this.scrollTo(L.save);
      return watchSave(
        () => this.tap(L.save),
        () => this.isShown(),
        () => this.visibleLabels(),
        async () => "",
      );
    });
  }

  private async typed(selector: string, label: string): Promise<string> {
    await this.scrollTo(selector);
    const raw = ((await $(selector).getText()) ?? "").replace(/\u00a0/g, " ").trim();
    if (raw.toLowerCase() === label.toLowerCase()) return "";
    const prefix = `${label}\n`;
    const value = raw.toLowerCase().startsWith(prefix.toLowerCase()) ? raw.slice(prefix.length).trim() : raw;
    return value.replace(/\s*\*$/, "").trim();
  }
}
