import path from "node:path";
import userConfig from "../../automation.config.ts";
import { SUPPORTED_DOMAINS, type AutomationConfig, type DeviceType, type SellDoDomain } from "./schema.ts";

export const PROJECT_ROOT = path.resolve(import.meta.dirname, "..", "..");

interface DomainProfile {
  /** Web host the domain represents. */
  webUrl: string;
  /** Rails host that serves api_key JSON (`/client/*.json`, `/api/leads/*`). */
  apiBaseUrl: string;
  /** Rails host that serves `/api/v3/*` (JWT). On staging that is v2a, not v2 or v2b. */
  v3ApiBaseUrl: string;
  /** Backend hosts a mobile build may be compiled against and still share this domain's data. */
  appBackendHosts: string[];
}

/**
 * v2, v2a and v2b are one staging stack sharing a database. v2b is the CRM 2.0
 * Next.js UI: legacy `/client/*.json` returns 404 there and `/api/v3/*` needs a
 * JWT, so api_key traffic for v2b goes to v2.
 */
const STAGING_APP_HOSTS = ["v2.sell.do", "v2a.sell.do", "v2b.sell.do"];

const DOMAIN_PROFILES: Record<SellDoDomain, DomainProfile> = {
  "v2.sell.do": { webUrl: "https://v2.sell.do", apiBaseUrl: "https://v2.sell.do", v3ApiBaseUrl: "https://v2a.sell.do", appBackendHosts: STAGING_APP_HOSTS },
  "v2b.sell.do": { webUrl: "https://v2b.sell.do", apiBaseUrl: "https://v2.sell.do", v3ApiBaseUrl: "https://v2a.sell.do", appBackendHosts: STAGING_APP_HOSTS },
  "app.sell.do": { webUrl: "https://app.sell.do", apiBaseUrl: "https://app.sell.do", v3ApiBaseUrl: "https://app.sell.do", appBackendHosts: ["app.sell.do"] },
};

function env(name: string): string | undefined {
  const value = process.env[name];
  return value == null || value.trim() === "" ? undefined : value.trim();
}

function envNumber(name: string, fallback: number): number {
  const raw = env(name);
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number. Got: ${raw}`);
  return n;
}

function envList(name: string, fallback: string[]): string[] {
  const raw = env(name);
  return raw === undefined ? fallback : raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function resolve(config: AutomationConfig) {
  const domain = (env("SELLDO_DOMAIN") ?? config.domain) as SellDoDomain;
  if (!SUPPORTED_DOMAINS.includes(domain)) {
    throw new Error(`domain must be one of ${SUPPORTED_DOMAINS.join(", ")}. Got: ${domain}`);
  }
  const profile = DOMAIN_PROFILES[domain];

  const deviceType = (env("DEVICE_TYPE") ?? config.device.type) as DeviceType;
  if (deviceType !== "real" && deviceType !== "emulator") {
    throw new Error(`device.type must be "real" or "emulator". Got: ${deviceType}`);
  }

  if (env("APK_PATH")) {
    throw new Error(
      "APK_PATH is not used. Tests always launch the sell.do app already installed on the device and never install an APK.",
    );
  }

  const credentials = {
    clientId: env("SELLDO_CLIENT_ID") ?? config.credentials.clientId,
    fullAccessApiKey: env("SELLDO_FULL_ACCESS_API_KEY") ?? config.credentials.fullAccessApiKey,
    userPassword: env("SELLDO_USER_PASSWORD") ?? config.credentials.userPassword,
  };
  for (const [key, value] of Object.entries(credentials)) {
    if (!value) throw new Error(`credentials.${key} is required in automation.config.ts`);
  }

  return Object.freeze({
    domain,
    webUrl: profile.webUrl,
    apiBaseUrl: env("SELLDO_API_BASE_URL") ?? profile.apiBaseUrl,
    v3ApiBaseUrl: profile.v3ApiBaseUrl,
    appBackendHosts: profile.appBackendHosts,
    credentials,
    device: {
      type: deviceType,
      udid: env("DEVICE_UDID") ?? config.device.udid,
      avdName: env("AVD_NAME") ?? config.device.avdName,
      platformVersion: env("DEVICE_PLATFORM_VERSION") ?? config.device.platformVersion,
    },
    app: config.app,
    test: {
      ...config.test,
      specs: envList("TEST_SPECS", config.test.specs),
      grep: env("TEST_GREP") ?? config.test.grep,
      specFileRetries: envNumber("TEST_SPEC_RETRIES", config.test.specFileRetries),
      appium: {
        ...config.test.appium,
        port: envNumber("APPIUM_PORT", config.test.appium.port),
      },
    },
  });
}

export const settings = resolve(userConfig);
export type Settings = typeof settings;
