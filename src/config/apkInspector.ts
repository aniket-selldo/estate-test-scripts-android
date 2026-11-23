import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { adb } from "./capabilities.ts";
import { settings } from "./environment.ts";

/** Hosts that appear in every build and are not the API base URL. */
const NON_API_HOSTS = new Set(["pages.sell.do", "www.sell.do"]);

/**
 * Reads the backend host(s) compiled into a Flutter APK. Flutter stores
 * `libapp.so` uncompressed, so the Dart string constants are visible in the raw bytes.
 */
function hostsInApk(file: string): string[] {
  const text = readFileSync(file).toString("latin1");
  const hosts = new Set<string>();
  for (const match of text.matchAll(/https:\/\/([a-z0-9-]+\.sell\.do)\//g)) {
    if (!NON_API_HOSTS.has(match[1])) hosts.add(match[1]);
  }
  return [...hosts];
}

function hostsInInstalledApp(serial: string, appPackage: string): string[] {
  const apkPaths = adb(["-s", serial, "shell", "pm", "path", appPackage])
    .split(/\r?\n/)
    .map((line) => line.replace(/^package:/, "").trim())
    .filter(Boolean);
  if (apkPaths.length === 0) {
    throw new Error(
      `${appPackage} is not installed on ${serial}. Install the sell.do app on the device; the suite never installs an APK.`,
    );
  }
  const dir = mkdtempSync(path.join(os.tmpdir(), "selldo-apk-"));
  try {
    const hosts = new Set<string>();
    apkPaths.forEach((remote, i) => {
      const local = path.join(dir, `part${i}.apk`);
      adb(["-s", serial, "pull", remote, local], 180_000);
      hostsInApk(local).forEach((h) => hosts.add(h));
    });
    return [...hosts];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export interface ApkBackendCheck {
  source: string;
  hosts: string[];
  matches: boolean;
}

/**
 * Verifies the installed sell.do build talks to the same environment as `settings.domain`.
 * Without this, a production install + staging domain fails later as a confusing "invalid credentials".
 */
export function checkApkBackend(serial: string | null): ApkBackendCheck | null {
  const { appPackage } = settings.app;
  if (!serial) return null;
  const source = `${appPackage} installed on ${serial}`;
  const hosts = hostsInInstalledApp(serial, appPackage);
  if (hosts.length === 0) return { source, hosts, matches: true };
  return { source, hosts, matches: hosts.some((h) => settings.appBackendHosts.includes(h)) };
}
