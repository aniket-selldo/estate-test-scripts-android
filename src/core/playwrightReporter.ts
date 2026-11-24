import WDIOReporter, { type HookStats, type RunnerStats, type TestStats } from "@wdio/reporter";
import type { Reporters } from "@wdio/types";
import { appendRunEntry, displayPath, formatTestLine, publishLine, testLocation, type RunEntry } from "./consoleRun.ts";
import { redact } from "./reporting.ts";

/**
 * Prints each test the way Playwright's list reporter does.
 * Lines go through the launcher so they stay free of the `[0-0]` worker prefix.
 */
export default class PlaywrightReporter extends WDIOReporter {
  private specFile = "";
  private sawFailure = false;

  constructor(options: Partial<Reporters.Options> = {}) {
    super({ stdout: true, ...options });
  }

  onRunnerStart(runner: RunnerStats): void {
    this.specFile = runner.specs[0] ?? "";
  }

  onTestPass(test: TestStats): void {
    this.publish(test, "passed");
  }

  onTestFail(test: TestStats): void {
    this.sawFailure = true;
    this.publish(test, "failed", test.error);
  }

  onTestSkip(test: TestStats): void {
    this.publish(test, "skipped");
  }

  onTestPending(test: TestStats): void {
    this.publish(test, "skipped");
  }

  onHookEnd(hook: HookStats): void {
    if (this.sawFailure || hook.retried || hook.failedTestUid || hook.state !== "failed" || !hook.error) return;
    this.sawFailure = true;
    const file = displayPath(this.specFile);
    this.publishEntry({
      state: "failed",
      location: file,
      title: hook.title || "Hook failed",
      durationMs: hook.duration,
      error: redact(formatError(hook.error)),
    });
  }

  onRunnerEnd(runner: RunnerStats): void {
    if (this.sawFailure || !runner.error) return;
    this.publishEntry({
      state: "failed",
      location: displayPath(runner.specs[0] ?? this.specFile),
      title: "Failed to start the session",
      durationMs: runner.duration,
      error: redact(runner.error),
    });
  }

  private publish(test: TestStats, state: RunEntry["state"], error?: unknown): void {
    const file = displayPath(test.file || this.specFile);
    const parent = test.parent?.trim();
    const title = parent && parent !== test.title ? `${parent} › ${test.title}` : test.title;
    this.publishEntry({
      state,
      location: testLocation(file, test.title),
      title,
      durationMs: test.duration,
      error: error ? redact(formatError(error)) : undefined,
    });
  }

  private publishEntry(entry: Omit<RunEntry, "index">): void {
    publishLine(formatTestLine(appendRunEntry(entry)));
  }
}

function formatError(error: unknown): string {
  if (typeof error === "string") return error.trim() || "The test failed.";
  if (!error || typeof error !== "object") return "The test failed.";
  const err = error as Error;
  const message = (err.message || err.name || "The test failed.").trim();
  const frames = (err.stack ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("at ") && !line.includes("node_modules") && !line.includes("node:internal"))
    .slice(0, 5);
  return [message, ...frames].join("\n");
}
