import { $, driver } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { snackbarText, watchSave, type SaveOutcome } from "../components/formSave.ts";
import { SendEmailLocators as L } from "./SendEmail.locators.ts";

/** Send email. Opened from the lead's more-actions sheet with the lead already chosen. */
export class SendEmailScreen extends BaseScreen {
  protected readonly name = "Send email";
  protected readonly trait = L.subject;

  /** The value under the Email type label. A general email shows "General email". */
  async shownType(): Promise<string> {
    return this.fieldValue(L.emailType);
  }

  /** The value under the To label. The primary address is selected when the lead has one. */
  async shownTo(): Promise<string> {
    return this.fieldValue(L.to);
  }

  async enterMessage(subject: string, body: string): Promise<void> {
    await step("Enter the email subject and body", async () => {
      await this.type(L.subject, subject);
      const editor = $(L.body);
      await this.scrollTo(L.body);
      await editor.waitForDisplayed({ timeout: this.timeout, timeoutMsg: `${this.name}: the body editor is not on screen` });
      await editor.click();
      await driver.keys(body.split(""));
      await this.hideKeyboard();
    });
  }

  async save(): Promise<SaveOutcome> {
    return step("Tap Send email", async () => {
      await this.scrollTo(L.save);
      return watchSave(
        () => this.tap(L.save),
        () => this.isShown(),
        () => this.visibleLabels(),
        () => snackbarText(L.sentSnackbar),
      );
    });
  }

  private async fieldValue(selector: string): Promise<string> {
    await this.scrollTo(selector);
    const desc = (await $(selector).getAttribute("content-desc")) ?? "";
    return desc.split("\n").slice(1).join("\n").trim();
  }
}
