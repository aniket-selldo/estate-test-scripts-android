import { settings } from "../config/environment.ts";
import { HttpClient } from "./HttpClient.ts";
import { v3Headers } from "./v3Auth.ts";

export interface ListingColumn {
  id: string;
  label: string;
}

export interface LeadCustomValue {
  id: string;
  label: string;
  value: string;
}

/**
 * Lead listing columns and custom fields.
 * `GET /api/v3/listings/columns?entity=lead`
 * `GET /api/v3/custom_fields/autocomplete?class_type=lead`
 * `GET /api/v3/client/leads/:id/custom_fields`
 */
export class ListingColumnsApi {
  private readonly v3 = new HttpClient(settings.v3ApiBaseUrl);

  constructor(private readonly accessToken: string) {}

  async leadColumns(): Promise<ListingColumn[]> {
    const { body } = await this.v3.get<unknown>("/api/v3/listings/columns", {
      headers: this.auth(),
      query: { entity: "lead" },
    });
    return columnsFrom(body);
  }

  /**
   * A word from the label that `GET /api/v3/custom_fields/autocomplete` actually
   * returns. The column sheet sends the typed text as `q`, and a full label
   * such as "Credit Campaign Name" comes back empty.
   */
  async queryThatFinds(label: string): Promise<string> {
    const words = label
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 3)
      .sort((left, right) => right.length - left.length);
    for (const query of words) {
      const rows = await this.searchLeadCustomFields(query);
      if (rows.some((row) => row.label.toLowerCase() === label.toLowerCase())) return query;
    }
    throw new Error(`Autocomplete does not return "${label}" for any word in that label`);
  }

  /**
   * The first active lead custom field whose label is long enough for the
   * column sheet search (three characters). The autocomplete needs a query,
   * so a few short probes are tried until one returns a field.
   */
  async firstLeadCustomField(): Promise<ListingColumn> {
    const probes = ["name", "text", "date", "type", "pro", "bud", "cus", "lead", "field", "the", "aaa"];
    for (const query of probes) {
      const { body } = await this.v3.get<unknown>("/api/v3/custom_fields/autocomplete", {
        headers: this.auth(),
        query: { class_type: "lead", q: query, active: "true" },
      });
      const match = columnsFrom(body).find((column) => column.label.trim().length >= 3);
      if (match) return { id: match.id.startsWith("custom_") ? match.id : `custom_${match.id}`, label: match.label };
    }
    throw new Error("No active lead custom field was returned by GET /api/v3/custom_fields/autocomplete");
  }

  /** Values already stored on the lead, including blank custom fields. */
  async valuesForLead(leadId: string): Promise<LeadCustomValue[]> {
    const { body } = await this.v3.get<unknown>(`/api/v3/client/leads/${leadId}/custom_fields`, {
      headers: this.auth(),
    });
    return valuesFrom(body);
  }

  private async searchLeadCustomFields(query: string): Promise<ListingColumn[]> {
    const { body } = await this.v3.get<unknown>("/api/v3/custom_fields/autocomplete", {
      headers: this.auth(),
      query: { class_type: "lead", q: query, active: "true" },
    });
    return columnsFrom(body);
  }

  private auth(): Record<string, string> {
    return v3Headers(this.accessToken);
  }
}

function columnsFrom(body: unknown): ListingColumn[] {
  return rowsFrom(body).flatMap((row) => {
    const id = text(row.id) || text(row.field) || text(row.name) || text(row.value);
    const label = text(row.label) || text(row.text) || text(row.name);
    return id && label ? [{ id, label }] : [];
  });
}

function valuesFrom(body: unknown): LeadCustomValue[] {
  return rowsFrom(body).flatMap((row) => {
    const id = text(row.id) || text(row.field) || text(row.name) || text(row.key);
    const label = text(row.label) || text(row.text) || text(row.name);
    if (!id && !label) return [];
    const value = text(row.value) || text(row.display_value) || text(row.values);
    return [{ id, label, value }];
  });
}

function rowsFrom(body: unknown): Record<string, unknown>[] {
  const root = objectOf(body);
  const nested = root.results ?? root.custom_fields ?? root.data ?? root.columns ?? body;
  const list = Array.isArray(nested) ? nested : Array.isArray(body) ? body : [];
  return list.flatMap((row) => (row && typeof row === "object" ? [row as Record<string, unknown>] : []));
}

function objectOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return "";
}
