import { $, driver } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { by } from "../../core/locators.ts";
import { MaterialDateTimeLocators as L } from "./MaterialDateTime.locators.ts";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Drives the Material date dialog, then the time dialog, for one `AppFormField.dateTime`. */
export class MaterialDateTimeDialog extends BaseScreen {
  protected readonly name = "Date and time picker";
  protected readonly trait = L.ok;
  protected readonly isModal = true;

  async pick(when: Date): Promise<void> {
    await this.waitUntilShown();
    await this.selectDay(when);
    await this.confirm();
    await this.selectTime(when);
    await this.confirm();
  }

  private async selectDay(when: Date): Promise<void> {
    const month = MONTHS[when.getMonth()];
    const label = `${month} ${when.getDate()}, ${when.getFullYear()}`;
    for (let attempt = 0; attempt < 4; attempt++) {
      const day = $(by.clickableContains(label));
      if (await day.isDisplayed()) {
        await day.click();
        return;
      }
      const forward = when.getTime() > Date.now();
      await this.tap(forward ? L.nextMonth : L.previousMonth);
    }
    throw new Error(`${this.name}: day "${label}" not in the calendar. Visible: ${(await this.visibleLabels()).join(" || ")}`);
  }

  private async selectTime(when: Date): Promise<void> {
    await driver.waitUntil(
      async () => (await $(L.hour).isDisplayed()) || (await $(L.switchToTextInput).isDisplayed()),
      { timeout: this.timeout, timeoutMsg: `${this.name}: the time dialog did not open` },
    );
    if (await $(L.switchToTextInput).isDisplayed()) await this.tap(L.switchToTextInput);
    const hour24 = when.getHours();
    const usesPeriod = await $(L.pm).isDisplayed();
    const hour = usesPeriod ? String(hour24 % 12 || 12) : String(hour24);
    await this.type(L.hour, hour);
    await this.type(L.minute, String(when.getMinutes()).padStart(2, "0"));
    if (usesPeriod) await this.tap(hour24 >= 12 ? L.pm : L.am);
  }

  private async confirm(): Promise<void> {
    await this.tap(L.ok);
  }
}
