/**
 * Locator builders for the Flutter app under UiAutomator2.
 *
 * Flutter `Key`s are NOT exported to the Android accessibility tree, so they cannot be
 * used by UiAutomator2. What Flutter does export (verified with Appium page source):
 *   - Semantics label / button text / Tooltip -> `content-desc`  (Appium accessibility id)
 *   - TextField label / hint                  -> `hint` on android.widget.EditText
 *   - Semantics(identifier: ...)              -> `resource-id`   (best; needs app support)
 *
 * Priority (see .cursor/rules/appium-locators.mdc): resource-id > accessibility id >
 * hint / label-prefix. Never positional XPath, bounds, or index.
 */

export function xpathLiteral(value: string): string {
  if (!value.includes('"')) return `"${value}"`;
  if (!value.includes("'")) return `'${value}'`;
  return `concat("${value.split('"').join(`", '"', "`)}")`;
}

export const by = {
  /**
   * `Semantics(identifier: id)` in Dart -> the `resource-id` attribute.
   * The Appium `id` strategy does not match these Flutter identifiers, so this is an exact attribute match.
   */
  id: (id: string) => `//*[@resource-id=${xpathLiteral(id)}]`,

  /** Exact `content-desc`: buttons, icons with tooltip, list options, tabs. */
  a11y: (label: string) => `~${label}`,

  /** Exact `content-desc` on a clickable node, so a title with the same text is not tapped. */
  clickable: (label: string) => `//*[@clickable="true" and @content-desc=${xpathLiteral(label)}]`,

  /**
   * Text field by its label/hint. Uses starts-with because required fields get a " *" suffix
   * that depends on the client's configuration (e.g. "Primary email *").
   */
  textField: (label: string) =>
    `//android.widget.EditText[@hint=${xpathLiteral(label)} or starts-with(@hint, ${xpathLiteral(`${label} *`)})]`,

  /**
   * Tappable form field (dropdown/picker) whose `content-desc` is "<label>[ *]\n<value>".
   * Matching the newline keeps "Campaign" from also matching the "Campaign" section header.
   */
  formField: (label: string) =>
    `//*[@clickable="true" and (starts-with(@content-desc, ${xpathLiteral(`${label}\n`)}) or starts-with(@content-desc, ${xpathLiteral(`${label} *\n`)}))]`,

  /**
   * Exact `content-desc`, ignoring case. For options whose text comes from a data provider,
   * where the app may render a different case than the API (e.g. "Organic" vs "organic").
   */
  a11yIgnoreCase: (label: string) =>
    `//*[translate(@content-desc, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz")=${xpathLiteral(label.toLowerCase())}]`,

  /** Element whose `content-desc` contains static text from the Dart source (e.g. a snackbar). */
  a11yContains: (text: string) => `//*[contains(@content-desc, ${xpathLiteral(text)})]`,

  /** Clickable node whose `content-desc` contains the text. A calendar day shares its date with the header. */
  clickableContains: (text: string) =>
    `//*[@clickable="true" and contains(@content-desc, ${xpathLiteral(text)})]`,

  /** Element whose `content-desc` starts with a static prefix (e.g. a banner). */
  a11yPrefix: (prefix: string) => `//*[starts-with(@content-desc, ${xpathLiteral(prefix)})]`,
};
