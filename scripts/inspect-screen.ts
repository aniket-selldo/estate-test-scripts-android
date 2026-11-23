/**
 * `npm run inspect` - prints every addressable element on the CURRENT device screen with the
 * locator this framework would use for it. Navigate the app by hand first, then run.
 * Needs an Appium server on the configured port (`appium` in another terminal).
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { remote } from "webdriverio";
import { resolveDeviceSerial } from "../src/config/capabilities.ts";
import { PROJECT_ROOT, settings } from "../src/config/environment.ts";
import { by } from "../src/core/locators.ts";

const serial = resolveDeviceSerial();
if (!serial) throw new Error("Boot the emulator first; inspect attaches to a running device.");

const driver = await remote({
  hostname: settings.test.appium.host,
  port: settings.test.appium.port,
  logLevel: "error",
  capabilities: {
    platformName: "Android",
    "appium:automationName": "UiAutomator2",
    "appium:udid": serial,
    "appium:noReset": true,
    "appium:autoLaunch": false,
    "appium:newCommandTimeout": 120,
  } as WebdriverIO.Capabilities,
});

try {
  const source = await driver.getPageSource();
  const file = path.join(PROJECT_ROOT, "reports", `screen-${Date.now()}.xml`);
  writeFileSync(file, source);

  const decode = (v: string) => v.replace(/&#10;/g, "\n").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
  const rows: string[] = [];
  for (const match of source.matchAll(/<(android\.[\w.]+)\s([^>]*)>/g)) {
    const attrs = match[2];
    const attr = (name: string) => decode(attrs.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? "");
    const cls = match[1].split(".").pop();
    const id = attr("resource-id");
    const desc = attr("content-desc");
    const hint = attr("hint");
    const clickable = attr("clickable") === "true";
    let locator = "";
    if (id && !id.startsWith("android:")) locator = by.id(id);
    else if (cls === "EditText" && hint) locator = by.textField(hint.replace(/ \*$/, ""));
    else if (desc && desc.includes("\n") && clickable) locator = by.formField(desc.split("\n")[0].replace(/ \*$/, ""));
    else if (desc) locator = by.a11y(desc);
    if (!locator) continue;
    rows.push(`${(cls ?? "").padEnd(10)} ${clickable ? "tap " : "    "} ${JSON.stringify(desc || hint || id).padEnd(45)} ${locator}`);
  }
  console.log(`Activity: ${await driver.getCurrentActivity()}\n`);
  console.log(rows.join("\n"));
  console.log(`\nFull page source: ${file}`);
} finally {
  await driver.deleteSession();
}
