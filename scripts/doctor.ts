/**
 * Preflight: `npm run doctor`. Checks everything a run needs, without starting a session.
 */
import { execSync } from "node:child_process";
import { UserRole, UsersApi } from "../src/api/UsersApi.ts";
import { LeadsApi } from "../src/api/LeadsApi.ts";
import { checkApkBackend } from "../src/config/apkInspector.ts";
import { adb, listAdbDevices, resolveDeviceSerial } from "../src/config/capabilities.ts";
import { settings } from "../src/config/environment.ts";

let failures = 0;

async function check(name: string, fn: () => string | Promise<string>): Promise<void> {
  try {
    console.log(`  OK   ${name}: ${await fn()}`);
  } catch (error) {
    failures++;
    console.log(`  FAIL ${name}: ${(error as Error).message.split("\n")[0]}`);
  }
}

function run(cmd: string): string {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

console.log(`\nSell.do mobile automation - doctor`);
console.log(`domain=${settings.domain}  api=${settings.apiBaseUrl}  device=${settings.device.type}\n`);

await check("Node.js", () => process.version);
await check("ANDROID_HOME", () => {
  const home = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  if (!home) throw new Error("not set");
  return home;
});
await check("Java", () => run("java -version 2>&1").split("\n")[0]);
await check("Appium", () => run("appium --version"));
await check("UiAutomator2 driver", () => {
  const list = run("appium driver list --installed --json");
  const drivers = JSON.parse(list) as Record<string, { version: string }>;
  if (!drivers.uiautomator2) throw new Error("not installed - run: appium driver install uiautomator2");
  return drivers.uiautomator2.version;
});
await check("adb devices", () => JSON.stringify(listAdbDevices()));

let serial: string | null = null;
await check(`Device (${settings.device.type})`, () => {
  serial = resolveDeviceSerial();
  if (!serial) return `emulator "${settings.device.avdName}" will be booted by Appium`;
  const model = adb(["-s", serial, "shell", "getprop", "ro.product.model"]);
  const release = adb(["-s", serial, "shell", "getprop", "ro.build.version.release"]);
  return `${serial} (${model}, Android ${release})`;
});
await check(`Installed ${settings.app.appPackage}`, () => {
  if (!serial) {
    return `skipped until emulator "${settings.device.avdName}" is booted; install ${settings.app.appPackage} on it first`;
  }
  const installed = adb(["-s", serial, "shell", "pm", "path", settings.app.appPackage]);
  if (!installed.includes("package:")) {
    throw new Error(`${settings.app.appPackage} is not installed on ${serial}. Install sell.do on the device; the suite does not install an APK.`);
  }
  return installed.split(/\r?\n/)[0];
});
await check("App build vs domain", () => {
  const result = checkApkBackend(serial);
  if (!result) return `skipped until emulator "${settings.device.avdName}" is booted`;
  if (result.hosts.length === 0) return `host not detectable in ${result.source}`;
  if (!result.matches) throw new Error(`${result.source} uses ${result.hosts.join(", ")}; domain ${settings.domain} needs ${settings.appBackendHosts.join("/")}`);
  return `${result.source} -> ${result.hosts.join(", ")}`;
});
await check("Full-access key (users listing)", async () => {
  const users = await new UsersApi().listActiveUsers(UserRole.Sales);
  return `${users.length} active sales users on first page`;
});
await check("Full-access key (retrieve_lead)", async () => {
  const r = await new LeadsApi().retrieve("doctor-nonexistent@example.com");
  return `reachable (exists=${r.exists})`;
});

console.log(failures ? `\n${failures} check(s) failed.\n` : "\nAll checks passed.\n");
process.exit(failures ? 1 : 0);
