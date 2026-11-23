import { execFileSync } from "node:child_process";
import path from "node:path";
import { settings } from "./environment.ts";

export interface AdbDevice {
  serial: string;
  state: string;
  isEmulator: boolean;
}

export function adbPath(): string {
  const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  return sdk ? path.join(sdk, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb") : "adb";
}

export function adb(args: string[], timeoutMs = 60_000): string {
  return execFileSync(adbPath(), args, { encoding: "utf8", timeout: timeoutMs, stdio: ["ignore", "pipe", "pipe"] }).trim();
}

export function listAdbDevices(): AdbDevice[] {
  return adb(["devices"])
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([serial, state]) => serial && state)
    .map(([serial, state]) => ({ serial, state, isEmulator: serial.startsWith("emulator-") }));
}

/** Picks the adb serial to run on, or null when an emulator must be booted from `device.avdName`. */
export function resolveDeviceSerial(): string | null {
  const { type, udid, avdName } = settings.device;
  const devices = listAdbDevices();

  if (udid) {
    const match = devices.find((d) => d.serial === udid);
    if (!match) throw new Error(`Device "${udid}" is not connected. adb sees: ${JSON.stringify(devices)}`);
    if (match.state !== "device") {
      throw new Error(`Device "${udid}" is "${match.state}". Unlock it and accept the USB debugging prompt.`);
    }
    return udid;
  }

  const candidates = devices.filter((d) => d.state === "device" && d.isEmulator === (type === "emulator"));
  if (type === "real") {
    if (candidates.length === 0) {
      const unauthorized = devices.filter((d) => !d.isEmulator && d.state !== "device");
      throw new Error(
        unauthorized.length
          ? `USB device ${unauthorized[0].serial} is "${unauthorized[0].state}". Accept the USB debugging prompt on the phone.`
          : "No real device connected via USB. Enable USB debugging and check `adb devices`.",
      );
    }
    if (candidates.length > 1) {
      throw new Error(`More than one USB device connected (${candidates.map((d) => d.serial).join(", ")}). Set device.udid.`);
    }
    return candidates[0].serial;
  }

  if (candidates.length > 1) {
    throw new Error(`More than one emulator running (${candidates.map((d) => d.serial).join(", ")}). Set device.udid.`);
  }
  if (candidates.length === 1) return candidates[0].serial;
  if (!avdName) throw new Error('device.type is "emulator" but no emulator is running and device.avdName is empty.');
  return null;
}

export function buildCapabilities(): WebdriverIO.Capabilities {
  const serial = resolveDeviceSerial();
  const { app, device } = settings;

  const caps: Record<string, unknown> = {
    platformName: "Android",
    "appium:automationName": "UiAutomator2",
    "appium:appPackage": app.appPackage,
    "appium:appActivity": app.appActivity,
    // Launch the installed sell.do package. appium:app is never set, so Appium does not install an APK.
    "appium:noReset": !app.resetAppDataBeforeEachSpec,
    "appium:fullReset": false,
    "appium:autoGrantPermissions": true,
    "appium:newCommandTimeout": 300,
    "appium:disableWindowAnimation": true,
    "appium:uiautomator2ServerLaunchTimeout": 120_000,
    "appium:uiautomator2ServerInstallTimeout": 120_000,
    "appium:adbExecTimeout": 120_000,
    "appium:androidInstallTimeout": 180_000,
    // Flutter keeps animating (shimmers, tickers); a long idle wait slows every command.
    "appium:settings[waitForIdleTimeout]": 300,
  };
  if (serial) caps["appium:udid"] = serial;
  else {
    caps["appium:avd"] = device.avdName;
    caps["appium:avdLaunchTimeout"] = 240_000;
    caps["appium:avdReadyTimeout"] = 240_000;
  }
  if (device.platformVersion) caps["appium:platformVersion"] = device.platformVersion;

  return caps as WebdriverIO.Capabilities;
}
