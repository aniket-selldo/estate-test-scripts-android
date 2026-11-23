/**
 * Rerun the spec files that failed in the most recent completed execution.
 * `npm run test:failed`
 *
 * The list is `reports/last-run.json`, written by the WebdriverIO launcher
 * after a run that started at least one spec. The rerun uses the same config,
 * so it launches the sell.do app already installed on the device.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { PROJECT_ROOT } from "../src/config/environment.ts";
import { readLastRun } from "../src/core/lastRun.ts";

const last = readLastRun();
if (!last) {
  console.error("No recent execution found. Run npm test (or npm run test:smoke / test:spec) first.");
  process.exit(1);
}
if (last.failedSpecs.length === 0) {
  console.log(`Last run (${last.finishedAt}) had no failed tests.`);
  process.exit(0);
}

console.log(`Rerunning ${last.failedSpecs.length} failed spec(s) from ${last.finishedAt}:`);
for (const spec of last.failedSpecs) console.log(`  ${spec}`);

const wdio = path.join(PROJECT_ROOT, "node_modules", "@wdio", "cli", "bin", "wdio.js");
const args = [wdio, "run", "./wdio.conf.ts", ...last.failedSpecs.flatMap((spec) => ["--spec", spec])];
const result = spawnSync(process.execPath, args, { cwd: PROJECT_ROOT, stdio: "inherit" });
process.exit(result.status ?? 1);
