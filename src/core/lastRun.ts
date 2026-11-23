import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "../config/environment.ts";

/** Written at the end of a run that actually started specs. Gitignored under reports/. */
export const LAST_RUN_FILE = path.join(PROJECT_ROOT, "reports", "last-run.json");

export interface LastRun {
  finishedAt: string;
  failedSpecs: string[];
}

/** Spec path as a `./tests/specs/...` argument for `wdio --spec`. */
export function toSpecArg(file: string): string {
  const relative = path.relative(PROJECT_ROOT, path.resolve(file));
  if (relative.startsWith("..") || path.isAbsolute(relative)) return file;
  return `./${relative.split(path.sep).join("/")}`;
}

export function writeLastRun(failedSpecs: string[]): void {
  const payload: LastRun = {
    finishedAt: new Date().toISOString(),
    failedSpecs: [...new Set(failedSpecs)].sort(),
  };
  mkdirSync(path.dirname(LAST_RUN_FILE), { recursive: true });
  writeFileSync(LAST_RUN_FILE, `${JSON.stringify(payload, null, 2)}\n`);
}

export function readLastRun(): LastRun | null {
  try {
    const parsed = JSON.parse(readFileSync(LAST_RUN_FILE, "utf8")) as LastRun;
    if (!parsed || !Array.isArray(parsed.failedSpecs)) return null;
    return { finishedAt: parsed.finishedAt ?? "", failedSpecs: parsed.failedSpecs.filter((spec) => typeof spec === "string" && spec.length > 0) };
  } catch {
    return null;
  }
}
