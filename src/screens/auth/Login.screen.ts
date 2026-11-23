import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { LoginLocators as L } from "./Login.locators.ts";

/** Splash can take a while on a cold start after app data is cleared. */
const COLD_START_TIMEOUT_MS = 60_000;

export class LoginScreen extends BaseScreen {
  protected readonly name = "Login screen";
  protected readonly trait = L.signIn;

  async signIn(email: string, password: string): Promise<void> {
    await step(`Sign in as ${email}`, async () => {
      await this.waitUntilShown(COLD_START_TIMEOUT_MS);
      await this.type(L.email, email);
      await this.type(L.password, password, { secret: true });
      await this.hideKeyboard();
      await this.tap(L.signIn);
    });
  }
}
