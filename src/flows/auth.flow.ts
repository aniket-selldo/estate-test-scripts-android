import { driver } from "@wdio/globals";
import type { BaseScreen } from "../core/BaseScreen.ts";
import { step } from "../core/reporting.ts";
import { AppPermissionsScreen } from "../screens/auth/AppPermissions.screen.ts";
import { LoginScreen } from "../screens/auth/Login.screen.ts";
import { OtpVerificationScreen } from "../screens/auth/OtpVerification.screen.ts";
import { AppUpdateSheet } from "../screens/components/AppUpdateSheet.screen.ts";
import { CompromisedDeviceDialog } from "../screens/components/CompromisedDeviceDialog.screen.ts";
import { WhatsNewSheet } from "../screens/components/WhatsNewSheet.screen.ts";
import { HomeScreen } from "../screens/home/Home.screen.ts";

const SETTLE_TIMEOUT_MS = 60_000;
/** Home must be seen this many polls in a row: What's New opens a moment after Home renders. */
const HOME_STABLE_POLLS = 2;
const HOME_POLL_INTERVAL_MS = 1_000;

/**
 * Signs in and lands on Home. After "Sign in" the app may first show the permissions prompt
 * (open_signed_in_route.dart), the update sheet and/or What's New; each is handled here.
 * OTP and rooted-device states cannot be automated and fail with an explanation.
 */
export async function loginAs(email: string, password: string): Promise<HomeScreen> {
  return step(`Log in as ${email} and reach Home`, async () => {
    await new LoginScreen().signIn(email, password);

    const home = new HomeScreen();
    const permissions = new AppPermissionsScreen();
    const whatsNew = new WhatsNewSheet();
    const update = new AppUpdateSheet();
    const blockers: [BaseScreen, string][] = [
      [new OtpVerificationScreen(), "Login requires OTP for this user; pick a user without 2FA."],
      [new CompromisedDeviceDialog(), "App blocked: rooted device detected. Use a non-rooted phone or an emulator."],
    ];

    const deadline = Date.now() + SETTLE_TIMEOUT_MS;
    let homePolls = 0;
    while (Date.now() < deadline) {
      if (await whatsNew.isShown()) await whatsNew.dismiss();
      else if (await permissions.isShown()) await permissions.skip();
      else if (await update.isShown()) await update.skip();
      for (const [screen, reason] of blockers) {
        if (await screen.isShown()) throw new Error(reason);
      }
      homePolls = (await home.isShown()) ? homePolls + 1 : 0;
      if (homePolls >= HOME_STABLE_POLLS) return home;
      if (homePolls > 0) await driver.pause(HOME_POLL_INTERVAL_MS);
    }
    throw new Error(`Login did not reach Home within ${SETTLE_TIMEOUT_MS / 1000}s`);
  });
}
