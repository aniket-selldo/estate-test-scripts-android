/**
 * ============================================================================
 *  Sell.do CRM Mobile - Appium automation configuration
 *  THIS IS THE ONLY FILE YOU NEED TO EDIT TO RUN THE SUITE.
 * ============================================================================
 *
 * Every value can also be overridden with an environment variable (shown next
 * to each field) so CI can run the same suite against another environment
 * without editing this file.
 */
import { defineConfig } from "./src/config/schema.ts";

export default defineConfig({
  /**
   * Sell.do environment the tests run against.            env: SELLDO_DOMAIN
   *   "v2.sell.do"  | "v2b.sell.do" | "app.sell.do"
   * API calls are routed to the correct Rails host automatically
   * (v2b is the CRM 2.0 web UI; its api_key JSON lives on v2.sell.do).
   */
  domain: "v2b.sell.do",

  /**
   * Credentials for the sell.do client under test - the only stored test values.
   * Everything else (users, campaigns, stages, the restricted website API key) is read
   * at runtime through the full-access key.
   */
  credentials: {
    clientId: "67da7d8fb0834512cba20c6f", //                   env: SELLDO_CLIENT_ID
    /** Full-access API key: users, client config, lead retrieve. env: SELLDO_FULL_ACCESS_API_KEY */
    fullAccessApiKey: "8be2740236faee3e3563fdbdecbe4e3b",
    /** Password shared by every test user.                      env: SELLDO_USER_PASSWORD */
    userPassword: "amura@123",
  },

  /** Device the app runs on. */
  device: {
    /** "real" = phone connected via USB, "emulator" = Android Virtual Device. env: DEVICE_TYPE */
    type: "real",
    /** adb serial (`adb devices`). Leave "" to use the only connected device. env: DEVICE_UDID */
    udid: "",
    /** Emulator only: AVD name (`emulator -list-avds`). Booted automatically if not running. env: AVD_NAME */
    avdName: "Small_Phone_2",
    /** Optional Android version filter, e.g. "13". Leave "" to accept any. env: DEVICE_PLATFORM_VERSION */
    platformVersion: "",
  },

  /**
   * App under test: the sell.do build already installed on the device.
   * The suite launches this package and never installs an APK.
   * The installed build's compiled backend host must belong to `domain`
   * (a staging build for v2/v2b, a production build for app).
   */
  app: {
    appPackage: "sell.do",
    appActivity: "com.selldo.crm.MainActivity",
    /** Clear app data before every spec file so each one starts logged out. */
    resetAppDataBeforeEachSpec: true,
  },

  /** Test run configuration. */
  test: {
    /** Spec files to run (glob, relative to project root).            env: TEST_SPECS */
    specs: ["./tests/specs/**/*.spec.ts"],
    /** Only run tests whose title contains this tag, e.g. "@smoke". "" = all. env: TEST_GREP */
    grep: "",
    /** Re-run a failed spec file this many times (0 = never; keep 0 to see real flakiness). */
    specFileRetries: 0,
    /** Max wait for any single element / condition, in ms. */
    elementTimeoutMs: 20_000,
    /** Max duration of a single test, in ms. */
    testTimeoutMs: 5 * 60_000,
    /** Record a video of every test; kept only when the test fails. */
    recordVideoOnFailure: true,
    /** Appium server. The suite starts its own server when `startServer` is true. */
    appium: { host: "127.0.0.1", port: 4723, startServer: true },
  },
});
