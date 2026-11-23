import { $, driver } from "@wdio/globals";
import { settings } from "../config/environment.ts";

const SCROLL_ATTEMPTS = 12;

/**
 * Shared, explicit-wait interactions. Screens never call `pause()`; every wait is a condition.
 */
export abstract class BaseScreen {
  /** A locator that is only present when this screen is showing. */
  protected abstract readonly trait: string;
  protected abstract readonly name: string;
  /**
   * Bottom sheets and dialogs: Appium's hideKeyboard sends ESC/BACK, which Flutter treats
   * as "dismiss" and closes the sheet. Modal screens never hide the keyboard.
   */
  protected readonly isModal: boolean = false;

  protected get timeout(): number {
    return settings.test.elementTimeoutMs;
  }

  async waitUntilShown(timeout = this.timeout): Promise<this> {
    await $(this.trait).waitForDisplayed({
      timeout,
      timeoutMsg: `${this.name} was not shown within ${timeout / 1000}s (waiting for ${this.trait})`,
    });
    return this;
  }

  async isShown(): Promise<boolean> {
    return $(this.trait).isDisplayed();
  }

  async waitUntilGone(timeout = this.timeout): Promise<void> {
    await $(this.trait).waitForDisplayed({
      timeout,
      reverse: true,
      timeoutMsg: `${this.name} was still shown after ${timeout / 1000}s`,
    });
  }

  protected async tap(selector: string, timeout = this.timeout): Promise<void> {
    const el = $(selector);
    await el.waitForDisplayed({ timeout, timeoutMsg: `${this.name}: "${selector}" not displayed` });
    await el.waitForEnabled({ timeout, timeoutMsg: `${this.name}: "${selector}" not enabled` });
    await el.click();
  }

  /** Types into a field and verifies the value landed (Flutter can drop input during rebuilds). */
  protected async type(selector: string, value: string, { secret = false } = {}): Promise<void> {
    const el = $(selector);
    await this.scrollTo(selector);
    await el.waitForDisplayed({ timeout: this.timeout, timeoutMsg: `${this.name}: field "${selector}" not displayed` });
    await el.click();
    await el.clearValue();
    await el.setValue(value);
    if (secret) return;
    await driver.waitUntil(async () => (await el.getText()) === value, {
      timeout: 5_000,
      timeoutMsg: `${this.name}: field "${selector}" shows "${await el.getText()}" instead of "${value}"`,
    });
  }

  protected async hideKeyboard(): Promise<void> {
    if (this.isModal) throw new Error(`${this.name}: hideKeyboard would dismiss this modal`);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
  }

  /**
   * Scrolls down until the element is visible; if the end of the list is reached first,
   * scrolls back up. Lazy Flutter lists only build what is near the viewport.
   */
  protected async scrollTo(selector: string): Promise<void> {
    const el = $(selector);
    if (await el.isDisplayed()) return;
    if (!this.isModal) await this.hideKeyboard();
    for (const direction of ["down", "up"] as const) {
      let previous = "";
      for (let attempt = 0; attempt < SCROLL_ATTEMPTS; attempt++) {
        await this.drag(direction);
        if (await el.isDisplayed()) return;
        const current = await driver.getPageSource();
        if (current === previous) break;
        previous = current;
      }
    }
    throw new Error(`${this.name}: "${selector}" not found scrolling down and up`);
  }

  /**
   * Moves content by ~35% of the screen. Holding before release stops Flutter's fling,
   * which would otherwise carry the list past the target between checks.
   */
  protected async drag(direction: "down" | "up"): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    const x = Math.round(width / 2);
    const [from, to] = direction === "down" ? [0.65, 0.3] : [0.3, 0.65];
    await driver
      .action("pointer", { parameters: { pointerType: "touch" } })
      .move({ x, y: Math.round(height * from) })
      .down()
      .move({ x, y: Math.round(height * to), duration: 600 })
      .pause(250)
      .up()
      .perform();
  }

  /** Visible text and accessibility labels; used to explain failures (e.g. a validation snackbar). */
  protected async visibleLabels(): Promise<string[]> {
    const source = await driver.getPageSource();
    const labels = new Set<string>();
    for (const match of source.matchAll(/(?:content-desc|text)=(?:"([^"]*)"|'([^']*)')/g)) {
      const value = (match[1] ?? match[2] ?? "").replace(/&#10;/g, " | ").replace(/&amp;/g, "&").trim();
      if ((value.length > 1 || value === "-") && value !== "false") labels.add(value);
    }
    return [...labels];
  }
}
