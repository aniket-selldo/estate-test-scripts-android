import { expect } from "@wdio/globals";
import { attachJson } from "./reporting.ts";

export interface FieldExpectation {
  actual: unknown;
  expected: string;
  /** Applied to both values before comparing (see `normalize`). */
  normalize?: (value: string) => string;
}

/**
 * Compares every field, attaches the table to the report and fails once with all mismatches.
 * The caller (the spec) decides which fields and values are expected.
 */
export function expectFields(title: string, fields: Record<string, FieldExpectation>): void {
  const rows = Object.entries(fields).map(([field, { actual, expected, normalize = (v: string) => v.trim() }]) => {
    const shown = actual == null ? "<missing>" : String(actual);
    return { field, expected, actual: shown, pass: normalize(expected) === normalize(shown) };
  });
  attachJson(`${title} - field comparison`, rows);
  expect(rows.filter((row) => !row.pass)).toEqual([]);
}
