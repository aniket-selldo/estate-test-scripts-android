import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { AppPermissionsLocators as L } from "./AppPermissions.locators.ts";

/** Opened after sign-in when permissions were never answered (open_signed_in_route.dart). */
export class AppPermissionsScreen extends BaseScreen {
  protected readonly name = "App permissions prompt";
  protected readonly trait = L.skip;

  /** "Skip for now" stores a dismissal and opens Home without OS dialogs. */
  async skip(): Promise<void> {
    await step("Skip the app permissions prompt", async () => {
      await this.tap(L.skip);
      await this.waitUntilGone();
    });
  }
}
