/** Headers the Flutter app sends on every `/api/v3` call (`bearer_auth.dart`). */
export function v3Headers(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, "X-Selldo-Request": "1" };
}

/** First scalar stored under `key`, either as a property or as a screen field `{ key, value }`. */
export function readValue(node: unknown, key: string): string {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = readValue(item, key);
      if (found) return found;
    }
    return "";
  }
  if (!node || typeof node !== "object") return "";
  const record = node as Record<string, unknown>;
  if (record.key === key && isScalar(record.value)) return String(record.value);
  if (key in record && isScalar(record[key])) return String(record[key]);
  for (const value of Object.values(record)) {
    const found = readValue(value, key);
    if (found) return found;
  }
  return "";
}

function isScalar(value: unknown): boolean {
  return value != null && typeof value !== "object";
}
