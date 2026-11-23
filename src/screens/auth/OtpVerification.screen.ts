import { BaseScreen } from "../../core/BaseScreen.ts";
import { OtpVerificationLocators as L } from "./OtpVerification.locators.ts";

/** Shown instead of Home for users with two-factor login; cannot be automated. */
export class OtpVerificationScreen extends BaseScreen {
  protected readonly name = "OTP verification screen";
  protected readonly trait = L.otpField;
}
