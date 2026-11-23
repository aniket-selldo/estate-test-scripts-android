import { BaseScreen } from "../../core/BaseScreen.ts";
import { CompromisedDeviceDialogLocators as L } from "./CompromisedDeviceDialog.locators.ts";

/** Blocks the app on rooted devices (emulators are exempt); cannot be dismissed. */
export class CompromisedDeviceDialog extends BaseScreen {
  protected readonly name = "Compromised device notice";
  protected readonly trait = L.notice;
  protected readonly isModal = true;
}
