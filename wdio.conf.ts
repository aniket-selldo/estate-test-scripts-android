import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { driver } from "@wdio/globals";
import type { Options } from "@wdio/types";
import { checkApkBackend } from "./src/config/apkInspector.ts";
import { buildCapabilities, resolveDeviceSerial } from "./src/config/capabilities.ts";
import { PROJECT_ROOT, settings } from "./src/config/environment.ts";
import { attachPng, attachText, attachVideo, log } from "./src/core/reporting.ts";

const REPORTS = path.join(PROJECT_ROOT, "reports");
const { test } = settings;
const { appium } = test;

function safeName(title: string): string {
  return title.replace(/[^a-z0-9]+/gi, "_").slice(0, 80);
}

export const config: Options.Testrunner & { capabilities: WebdriverIO.Capabilities[] } = {
  runner: "local",
  specs: test.specs,
  exclude: [],
  // One physical/virtual device = one session at a time.
  maxInstances: 1,
  capabilities: [buildCapabilities()],

  hostname: appium.host,
  port: appium.port,
  path: "/",
  logLevel: "warn",
  outputDir: path.join(REPORTS, "logs"),
  bail: 0,
  waitforTimeout: test.elementTimeoutMs,
  connectionRetryTimeout: 240_000,
  connectionRetryCount: 1,
  specFileRetries: test.specFileRetries,

  services: appium.startServer
    ? [["appium", { command: "appium", args: { address: appium.host, port: appium.port }, logPath: path.join(REPORTS, "logs") }]]
    : [],

  framework: "mocha",
  mochaOpts: {
    ui: "bdd",
    timeout: test.testTimeoutMs,
    ...(test.grep ? { grep: test.grep } : {}),
  },

  reporters: [
    "spec",
    [
      "allure",
      {
        outputDir: path.join(REPORTS, "allure-results"),
        disableWebdriverStepsReporting: true,
        disableWebdriverScreenshotsReporting: true,
        addConsoleLogs: true,
        reportedEnvironmentVars: {
          Domain: settings.domain,
          "API host": settings.apiBaseUrl,
          "Device type": settings.device.type,
          App: `${settings.app.appPackage} (installed)`,
        },
      },
    ],
  ],

  /** Fail fast on configuration mistakes before any session is created. */
  onPrepare() {
    mkdirSync(path.join(REPORTS, "screenshots"), { recursive: true });
    const serial = resolveDeviceSerial();
    const apk = checkApkBackend(serial);
    if (apk && apk.hosts.length > 0 && !apk.matches) {
      throw new Error(
        `The installed app (${apk.source}) talks to ${apk.hosts.join(", ")}, but domain is ${settings.domain} ` +
          `(expected one of ${settings.appBackendHosts.join(", ")}). Install a matching sell.do build or change domain in automation.config.ts.`,
      );
    }
    const env = settings.domain === "app.sell.do" ? "production" : "staging";
    const device = serial ? `${settings.device.type} ${serial}` : `${settings.device.type} ${settings.device.avdName}`;
    log.info(`Automation start: env=${env} domain=${settings.domain} device=${device}`);
  },

  async before() {
    await driver.setTimeout({ implicit: 0 });
  },

  async beforeTest(testCase: { title: string }) {
    log.info(`Test: ${testCase.title}`);
    if (test.recordVideoOnFailure) {
      await driver.startRecordingScreen({ timeLimit: 180, videoSize: "720x1280", forceRestart: true }).catch(() => undefined);
    }
  },

  /** Every failure leaves a screenshot, page source, logcat tail and video in the report. */
  async afterTest(testCase, _context, { passed }) {
    const video = test.recordVideoOnFailure ? await driver.stopRecordingScreen().catch(() => "") : "";
    if (passed) return;

    const name = safeName(`${testCase.parent} ${testCase.title}`);
    const screenshot = await driver.takeScreenshot().catch(() => "");
    if (screenshot) {
      attachPng("Screenshot on failure", screenshot);
      const file = path.join(REPORTS, "screenshots", `${name}_${Date.now()}.png`);
      writeFileSync(file, Buffer.from(screenshot, "base64"));
    }
    const source = await driver.getPageSource().catch(() => "");
    if (source) attachText("Page source on failure", source);
    const logcat = (await driver.getLogs("logcat").catch(() => [])) as { message: string }[];
    if (logcat.length) attachText("Logcat (last 300 lines)", logcat.slice(-300).map((l) => l.message).join("\n"));
    if (video) attachVideo("Screen recording", video);
  },
};
