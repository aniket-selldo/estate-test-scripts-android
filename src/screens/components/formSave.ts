import { $ } from "@wdio/globals";

const SAVE_TIMEOUT_MS = 30_000;
const SNACKBAR_TIMEOUT_MS = 5_000;

export interface SaveOutcome {
  formClosed: boolean;
  /** Labels that appeared while the screen stayed open (validation or the server message). */
  errors: string[];
  /** Snackbar text seen after the screen closed, or "" when none appeared. */
  successMessage: string;
}

/**
 * Taps save and reports whether the screen closed.
 * A rejection keeps the screen open and shows a short-lived snackbar, so new labels
 * are collected while waiting. Success closes the screen first and then shows the snackbar.
 */
export async function watchSave(
  tapSave: () => Promise<void>,
  stillOpen: () => Promise<boolean>,
  labels: () => Promise<string[]>,
  successText: () => Promise<string>,
): Promise<SaveOutcome> {
  const before = new Set(await labels());
  const appeared = new Set<string>();
  await tapSave();
  const deadline = Date.now() + SAVE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!(await stillOpen())) {
      return { formClosed: true, errors: [], successMessage: await successText() };
    }
    for (const label of await labels()) {
      if (!before.has(label)) appeared.add(label);
    }
  }
  return { formClosed: false, errors: [...appeared], successMessage: "" };
}

export async function snackbarText(selector: string): Promise<string> {
  const snackbar = $(selector);
  const shown = await snackbar.waitForDisplayed({ timeout: SNACKBAR_TIMEOUT_MS }).catch(() => false);
  if (!shown) return "";
  const desc = ((await snackbar.getAttribute("content-desc")) ?? "").trim();
  if (desc) return desc;
  return ((await snackbar.getText()) ?? "").trim();
}
