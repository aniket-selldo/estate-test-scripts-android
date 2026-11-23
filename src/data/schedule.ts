/** Tomorrow 1:00 PM local. Site visit tests book this start. */
export function siteVisitAt(): Date {
  return atLocalTime(1, 13);
}

/** Tomorrow 2:00 PM local. Follow-up tests book this time. */
export function followUpAt(): Date {
  return atLocalTime(1, 14);
}

/** A clock time on a day relative to today, in the machine's local timezone. */
export function atLocalTime(dayOffset: number, hour: number, minute = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/**
 * `yyyy-MM-dd HH:mm` in UTC. The site visit API stores schedule times in this form
 * (crm-flutter `site_visit_form.dart` `_utcInZone`).
 */
export function utcStamp(date: Date): string {
  return date.toISOString().slice(0, 16).replace("T", " ");
}

/**
 * Both sides of a schedule comparison down to the UTC minute.
 * The activities feed returns ISO (`2026-11-20T07:30:00.000+00:00`); the create
 * body uses `yyyy-MM-dd HH:mm`. `new Date` does not parse the space form.
 */
export function utcMinute(value: string): string {
  const trimmed = value.trim();
  const parsed = new Date(trimmed.includes("T") ? trimmed : `${trimmed.replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime()) ? trimmed.slice(0, 16) : parsed.toISOString().slice(0, 16).replace("T", " ");
}

/**
 * How a site visit time is written on the conversation card
 * (`lead_activity_summary.dart` `_when`): `dd/MM/yyyy, hh:mm AM`.
 */
export function visitWhen(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hour24 = date.getHours();
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minute = String(date.getMinutes()).padStart(2, "0");
  const suffix = hour24 >= 12 ? "PM" : "AM";
  return `${day}/${month}/${date.getFullYear()}, ${String(hour).padStart(2, "0")}:${minute} ${suffix}`;
}

/**
 * How a date-and-time form field shows the same clock time
 * (`app_form_field.dart` `formatFormDateTime`): `dd-MM-yyyy hh:mm AM`.
 */
export function formWhen(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hour24 = date.getHours();
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minute = String(date.getMinutes()).padStart(2, "0");
  const suffix = hour24 >= 12 ? "PM" : "AM";
  return `${day}-${month}-${date.getFullYear()} ${String(hour).padStart(2, "0")}:${minute} ${suffix}`;
}
