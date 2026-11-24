import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROJECT_ROOT } from "../config/environment.ts";

/** One finished test, written so the launcher can print the Playwright-style summary. */
export interface RunEntry {
  index: number;
  state: "passed" | "failed" | "skipped";
  /** `path:line:column`, the same shape Playwright prints. */
  location: string;
  title: string;
  durationMs: number;
  error?: string;
}

const RUN_DIR = path.join(PROJECT_ROOT, "reports");
const RUN_LOG = path.join(RUN_DIR, "console-run.jsonl");
const RUN_STARTED = path.join(RUN_DIR, "console-run-started-at");
const PROJECT = "android";

const useColor = Boolean(process.stdout.isTTY) || ["1", "2", "3", "true"].includes(process.env.FORCE_COLOR ?? "");

function ansi(code: string, text: string): string {
  if (!useColor || text.length === 0) return text;
  return `\u001b[${code}m${text}\u001b[0m`;
}

/** Same roles as Playwright's list reporter: dim meta, green pass, red fail, yellow skip. */
export const color = {
  bold: (text: string) => ansi("1", text),
  dim: (text: string) => ansi("2", text),
  red: (text: string) => ansi("31", text),
  green: (text: string) => ansi("32", text),
  yellow: (text: string) => ansi("33", text),
};

export function formatDuration(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  if (safe < 1000) return `${Math.round(safe)}ms`;
  const seconds = safe / 1000;
  if (seconds < 60) return `${trim(seconds)}s`;
  return `${trim(seconds / 60)}m`;
}

function trim(value: number): string {
  const text = value.toFixed(1);
  return text.endsWith(".0") ? text.slice(0, -2) : text;
}

export function displayPath(file: string | undefined): string {
  if (!file) return "spec";
  const filesystemPath = file.startsWith("file://") ? fileURLToPath(file) : file;
  const relative = path.relative(PROJECT_ROOT, path.resolve(filesystemPath));
  const shown = relative.startsWith("..") || path.isAbsolute(relative) ? filesystemPath : relative;
  return shown.split(path.sep).join("/");
}

/** Clears the per-run log. Called once from the launcher before workers start. */
export function resetConsoleRun(tests: number): void {
  mkdirSync(RUN_DIR, { recursive: true });
  writeFileSync(RUN_LOG, "");
  writeFileSync(RUN_STARTED, JSON.stringify({ startedAt: Date.now(), tests }));
}

/** `file:line:column` for the `it()` that has this title. The file path alone when it cannot be found. */
export function testLocation(file: string, title: string): string {
  const relative = file.split(path.sep).join("/");
  try {
    const source = readFileSync(path.join(PROJECT_ROOT, relative), "utf8");
    const lines = source.split(/\r?\n/);
    const index = lines.findIndex((line) => line.includes(title));
    if (index < 0) return relative;
    const column = Math.max(1, lines[index].indexOf("it(") + 1);
    return `${relative}:${index + 1}:${column}`;
  } catch {
    return relative;
  }
}

export function appendRunEntry(entry: Omit<RunEntry, "index">): RunEntry {
  mkdirSync(RUN_DIR, { recursive: true });
  const existing = readFileSync(RUN_LOG, "utf8").split("\n").filter(Boolean).length;
  const saved: RunEntry = { ...entry, index: existing + 1 };
  appendFileSync(RUN_LOG, `${JSON.stringify(saved)}\n`);
  return saved;
}

export function readConsoleRun(): { entries: RunEntry[]; elapsedMs: number } {
  const started = readMeta().startedAt;
  let entries: RunEntry[] = [];
  try {
    entries = readFileSync(RUN_LOG, "utf8")
      .split("\n")
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as RunEntry];
        } catch {
          return [];
        }
      });
  } catch {
    entries = [];
  }
  return { entries, elapsedMs: Date.now() - started };
}

/** Playwright's opening line: `Running 3 tests using 1 worker`. */
export function logRunStart(tests: number, filter: string): void {
  const noun = tests === 1 ? "test" : "tests";
  const matching = filter ? ` matching ${filter}` : "";
  console.log(`\nRunning ${tests} ${noun}${matching} using 1 worker\n`);
}

/** `  ✓  1 [android] › file:line:col › suite › title (54.8s)` */
export function formatTestLine(entry: RunEntry): string {
  const mark = entry.state === "passed" ? color.green("✓") : entry.state === "failed" ? color.red("✘") : color.yellow("-");
  const width = String(Math.max(readMeta().tests, entry.index)).length;
  const index = color.dim(String(entry.index).padStart(width));
  const where = color.dim(`[${PROJECT}] › ${entry.location} ›`);
  const duration = entry.state === "skipped" ? "" : color.dim(` (${formatDuration(entry.durationMs)})`);
  return `  ${mark}  ${index} ${where} ${paintSeparators(entry.title)}${duration}`;
}

/** Playwright's epilogue: error blocks, then `N failed` / `N passed (time)`. */
export function logRunSummary(entries: RunEntry[], elapsedMs: number): void {
  const failed = entries.filter((entry) => entry.state === "failed");
  const passed = entries.filter((entry) => entry.state === "passed");
  const skipped = entries.filter((entry) => entry.state === "skipped");
  const duration = color.dim(`(${formatDuration(elapsedMs)})`);

  for (const [index, entry] of failed.entries()) {
    console.log("");
    console.log(separator(`  ${index + 1}) [${PROJECT}] › ${entry.location} › ${entry.title} `));
    console.log("");
    for (const line of (entry.error || "The test failed.").split("\n")) {
      console.log(line.startsWith("at ") ? color.dim(`      ${line}`) : `    ${line}`);
    }
  }

  console.log("");
  if (failed.length === 0 && skipped.length === 0 && passed.length === 0) {
    console.log(`  ${color.yellow("no tests ran")} ${duration}`);
  }
  if (failed.length) {
    console.log(color.red(`  ${failed.length} failed`));
    for (const entry of failed) console.log(color.red(`    [${PROJECT}] › ${entry.location} › ${entry.title}`));
  }
  if (skipped.length) console.log(color.yellow(`  ${skipped.length} skipped`));
  if (passed.length) console.log(`${color.green(`  ${passed.length} passed`)} ${duration}`);
  console.log("");
}

/**
 * WebdriverIO prints its own worker status on the launcher console.
 * Drop those lines so the run reads as Playwright's list reporter.
 */
export function hideWdioStatusLines(): void {
  if (statusFilterInstalled) return;
  statusFilterInstalled = true;
  const original = console.log.bind(console);
  console.log = (...args: unknown[]) => {
    const plain = args.map((arg) => (typeof arg === "string" ? arg : "")).join(" ").replace(/\u001b\[[0-9;]*m/g, "");
    if (isWdioStatusLine(plain)) return;
    original(...args);
  };
}

/** Sends a line to the launcher so it is not prefixed with the worker id. */
export function publishLine(line: string): void {
  try {
    // Must be called as a method. A bare `send()` has no `this` and throws.
    if (typeof process.send === "function") {
      process.send({ name: "reporterRealTime", content: line });
      return;
    }
  } catch {
    // This process has no IPC channel.
  }
  console.log(line);
}

let statusFilterInstalled = false;

function readMeta(): { startedAt: number; tests: number } {
  try {
    const parsed = JSON.parse(readFileSync(RUN_STARTED, "utf8")) as { startedAt?: number; tests?: number };
    const startedAt = parsed?.startedAt;
    if (typeof startedAt === "number") return { startedAt, tests: parsed.tests || 1 };
  } catch {
    // The file is missing when a worker starts without onPrepare.
  }
  return { startedAt: Date.now(), tests: 1 };
}

function isWdioStatusLine(text: string): boolean {
  const line = text.trim();
  if (/^Execution of \d+ workers/.test(line)) return true;
  if (/^\[\d+-\d+\]/.test(line)) return true;
  if (line.includes("Spec Files:")) return true;
  return false;
}

function paintSeparators(title: string): string {
  return title.split(" › ").join(` ${color.dim("›")} `);
}

function separator(title: string): string {
  const width = process.stdout.columns || 100;
  const pad = Math.max(8, width - title.length);
  return color.dim(`${title}${"─".repeat(pad)}`);
}
