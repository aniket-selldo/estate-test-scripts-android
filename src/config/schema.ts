export const SUPPORTED_DOMAINS = ["v2.sell.do", "v2b.sell.do", "app.sell.do"] as const;
export type SellDoDomain = (typeof SUPPORTED_DOMAINS)[number];

export type DeviceType = "real" | "emulator";

export interface AutomationConfig {
  domain: SellDoDomain;
  credentials: {
    clientId: string;
    fullAccessApiKey: string;
    userPassword: string;
  };
  device: {
    type: DeviceType;
    udid: string;
    avdName: string;
    platformVersion: string;
  };
  app: {
    /** Package of the sell.do build already installed on the device. The suite never installs an APK. */
    appPackage: string;
    appActivity: string;
    resetAppDataBeforeEachSpec: boolean;
  };
  test: {
    specs: string[];
    grep: string;
    specFileRetries: number;
    elementTimeoutMs: number;
    testTimeoutMs: number;
    recordVideoOnFailure: boolean;
    appium: { host: string; port: number; startServer: boolean };
  };
}

/** Identity helper that gives `automation.config.ts` full type-checking and autocomplete. */
export function defineConfig(config: AutomationConfig): AutomationConfig {
  return config;
}
