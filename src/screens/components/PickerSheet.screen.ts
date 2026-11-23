import { $, $$, driver } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { xpathLiteral } from "../../core/locators.ts";
import { PickerSheetLocators as L } from "./PickerSheet.locators.ts";

export class PickerSheet extends BaseScreen {
  protected readonly trait = L.trait;
  protected readonly isModal = true;

  constructor(protected readonly name: string) {
    super();
  }

  /**
   * Taps the matching row.
   * A choice sheet stays a dialog only while its rows are on screen. The screen under it
   * can be a dialog too (Change stage), so closing is "the option rows are gone".
   * A lookup has a Search field and closes when that field is gone.
   */
  async select(option: string): Promise<void> {
    await this.waitUntilShown();
    if ((await $$(L.choiceRows).length) > 0) {
      const row = $(L.choice(option));
      if (!(await row.isDisplayed())) await this.scrollTo(L.choice(option));
      await row.click();
      await driver.waitUntil(async () => (await $$(L.choiceRows).length) === 0, {
        timeout: this.timeout,
        timeoutMsg: `${this.name} did not close after choosing "${option}"`,
      });
      return;
    }
    const row = $(L.lookup(option));
    if (!(await row.isDisplayed())) {
      await this.type(L.search, option);
      await this.scrollTo(L.lookup(option));
    }
    await row.click();
    await $(L.search).waitForDisplayed({
      reverse: true,
      timeout: this.timeout,
      timeoutMsg: `${this.name} did not close after choosing "${option}"`,
    });
  }

  /**
   * Types a fragment and taps the row whose label contains it.
   * Merge results are `#id First Last`, so the spec searches by the name it created.
   */
  /**
   * Multi-select rows stay open until Done (form_choice_sheet.dart FormChoiceDone).
   * One tap would leave the sheet open, so this confirms with Done.
   */
  async selectAndConfirm(option: string): Promise<void> {
    await this.waitUntilShown();
    const row = $(L.choice(option));
    if (!(await row.isDisplayed())) await this.scrollTo(L.choice(option));
    await row.click();
    await this.tap(L.done);
    await driver.waitUntil(async () => (await $$(L.choiceRows).length) === 0, {
      timeout: this.timeout,
      timeoutMsg: `${this.name} did not close after confirming "${option}"`,
    });
  }

  async chooseMatch(fragment: string): Promise<void> {
    await this.waitUntilShown();
    await this.type(L.search, fragment);
    const row = $(
      `//*[@clickable="true" and contains(@content-desc, ${xpathLiteral(fragment)}) and not(self::android.widget.EditText)]`,
    );
    await row.waitForDisplayed({
      timeout: this.timeout,
      timeoutMsg: `${this.name} has no row containing "${fragment}"`,
    });
    await row.click();
    await $(L.search).waitForDisplayed({
      reverse: true,
      timeout: this.timeout,
      timeoutMsg: `${this.name} did not close after choosing "${fragment}"`,
    });
  }
}
