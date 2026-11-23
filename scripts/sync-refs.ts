/**
 * `npm run refs:sync` - clones or updates the two source-of-truth repositories into ./.refs:
 *   .refs/crm-flutter  sell-do/crm-flutter (feature/mobile-api-v3-migration) -> screens, labels, Keys, app endpoints
 *   .refs/crm          sell-do/crm (feature-crm-2.0-dev)                      -> routes, controllers, validations
 *
 * The app branch must be the one the installed sell.do app was built from: `develop` still calls the
 * legacy `/client/*.json` API, the v3 branch calls `/api/v3/client/*`.
 *
 * The Rails repo has file names Windows cannot check out, so it is cloned without a working
 * tree; read files with `git -C .refs/crm show origin/feature-crm-2.0-dev:<path>`.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "../src/config/environment.ts";

const REFS = path.join(PROJECT_ROOT, ".refs");
const REPOS = [
  { name: "crm-flutter", url: "https://github.com/sell-do/crm-flutter.git", branch: "feature/mobile-api-v3-migration", checkout: true },
  { name: "crm", url: "https://github.com/sell-do/crm.git", branch: "feature-crm-2.0-dev", checkout: false },
];

function git(args: string[], cwd = REFS): void {
  execFileSync("git", args, { cwd, stdio: "inherit" });
}

mkdirSync(REFS, { recursive: true });
for (const repo of REPOS) {
  const dir = path.join(REFS, repo.name);
  if (!existsSync(dir)) {
    const args = ["clone", "--single-branch", "--branch", repo.branch, "--filter=blob:none"];
    if (!repo.checkout) args.push("--no-checkout");
    git([...args, repo.url, repo.name]);
  } else {
    git(["fetch", "origin", `+refs/heads/${repo.branch}:refs/remotes/origin/${repo.branch}`], dir);
    if (repo.checkout) git(["reset", "--hard", `origin/${repo.branch}`], dir);
  }
  console.log(`${repo.name}: origin/${repo.branch} ready in ${dir}`);
}
