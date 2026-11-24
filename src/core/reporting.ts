import { addAttachment, step as allureStep } from "@wdio/allure-reporter";

const startedAt = Date.now();

export const log = {
  info: (message: string) => console.log(`[${elapsed()}] ${message}`),
  warn: (message: string) => console.warn(`[${elapsed()}] WARN ${message}`),
};

function elapsed(): string {
  return `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
}

/** A named business step in the Allure report. The console list is printed by PlaywrightReporter. */
export function step<T>(name: string, body: () => Promise<T>): Promise<T> {
  return allureStep(name, () => body());
}

export function attachJson(name: string, data: unknown): void {
  void addAttachment(name, JSON.stringify(data, null, 2), "application/json");
}

export function attachText(name: string, text: string): void {
  void addAttachment(name, text, "text/plain");
}

export function attachPng(name: string, base64: string): void {
  void addAttachment(name, Buffer.from(base64, "base64"), "image/png");
}

export function attachVideo(name: string, base64: string): void {
  void addAttachment(name, Buffer.from(base64, "base64"), "video/mp4");
}

/** Masks secrets so API keys, tokens and passwords never land in logs or reports. */
export function redact(text: string): string {
  return text
    .replace(/((?:api_key|user_token)=)[^&\s"]+/gi, "$1***")
    .replace(/("(?:api_key|api_secret|authentication_token|access_token|refresh_token|password)"\s*:\s*")[^"]+/gi, "$1***");
}
