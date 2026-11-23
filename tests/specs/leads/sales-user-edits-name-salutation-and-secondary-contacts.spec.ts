import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { LeadsApi } from "../../../src/api/LeadsApi.ts";
import { LeadProfileApi } from "../../../src/api/LeadProfileApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { UserRole, UsersApi } from "../../../src/api/UsersApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { expectFields } from "../../../src/core/expectFields.ts";
import { normalize } from "../../../src/core/normalize.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { LeadFactory } from "../../../src/data/LeadFactory.ts";
import { createOwnedLead } from "../../../src/data/LeadSetup.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { findLead } from "../../../src/flows/leads.flow.ts";
import { LeadDetailScreen } from "../../../src/screens/leads/LeadDetail.screen.ts";

/**
 * LEAD-002 Sales user edits a lead created through the API.
 *
 * Preconditions:
 *   - an active sales user                    GET  /client/users.json                         Client::UsersController#index
 *   - a lead assigned to that user            POST /api/leads/create                          public lead capture
 *   - a salutation the form can save          GET  /api/v3/client/leads/lookups?type=salutations
 *
 * Under test (the app):
 *   - edit lead                               PATCH /api/v3/client/leads/:id                  Api::V3::Client::LeadsController#update
 *
 * Verification:
 *   - stored name, salutation, secondary contacts   GET /api/leads/:type/retrieve_lead
 *   - the same lead is found by the new email and the new phone
 */
describe("Leads | Edit lead", () => {
  it("@regression @leads LEAD-002 Sales user updates the name, salutation and secondary contacts and the backend stores them", async () => {
    await addFeature("Leads");
    await addStory("Sales user edits a lead");
    await addSeverity("critical");
    await addTestId("LEAD-002");

    const salesUser = await step("API: get an active sales user", () => new UsersApi().firstActiveUser(UserRole.Sales));
    const owned = await step("API: create a lead assigned to that user", () => createOwnedLead(salesUser));
    const token = await step("API: sign in as the sales user", () =>
      new SessionApi().accessToken(salesUser.email, settings.credentials.userPassword),
    );
    const salutation = await step("API: pick a salutation", async () => {
      const [first] = await new LeadProfileApi(token).salutations();
      return first;
    });
    const edited = LeadFactory.build();
    const secondary = LeadFactory.build();
    attachJson("Edit input", { salutation, edited, secondaryEmail: secondary.email, secondaryPhone: secondary.phone });

    await loginAs(salesUser.email, settings.credentials.userPassword);
    const detail = await findLead(owned.lead.email, `${owned.lead.firstName} ${owned.lead.lastName}`);
    const form = await (await detail.openMore()).editLead();
    await form.updateProfile({
      firstName: edited.firstName,
      lastName: edited.lastName,
      salutation: salutation.text,
      secondaryEmail: secondary.email,
      secondaryPhone: secondary.phone,
    });

    await step("UI: the form shows the salutation that was picked", async () => {
      expect(normalize.caseInsensitive(await form.shownSalutation())).toBe(normalize.caseInsensitive(salutation.text));
    });

    const outcome = await form.save();

    await step("UI: Save closes Edit lead and confirms the update", async () => {
      attachJson("Save outcome", outcome);
      expect(outcome.errors).toEqual([]);
      expect(outcome.formClosed).toBe(true);
      // lead_form.dart leadSaveMessage: "Lead updated successfully" unless the server sends its own message.
      expect(outcome.successMessage).toMatch(/Lead updated successfully/i);
    });
    await step("UI: the lead detail shows the new name", async () => {
      // The detail refreshes after Edit lead pops. Wait until the new name replaces the old one.
      const screen = await new LeadDetailScreen().waitUntilShown();
      const shown = await screen.waitForText(`${edited.firstName} ${edited.lastName}`);
      expect(shown).toContain(edited.firstName.toLowerCase());
      expect(shown).toContain(edited.lastName.toLowerCase());
    });

    const saved = await step("API: retrieve the lead by its original email", () =>
      new LeadsApi().retrieveWhenExists(owned.lead.email),
    );
    await step("API: name, salutation and both secondary contacts are stored", async () => {
      expect(saved.exists).toBe(true);
      const lead = saved.lead ?? { id: "" };
      expect(lead.id).toBe(owned.leadId);
      expectFields("Edited lead (app input vs retrieve_lead)", {
        first_name: { actual: lead.first_name, expected: edited.firstName },
        last_name: { actual: lead.last_name, expected: edited.lastName },
        name: { actual: lead.name, expected: `${edited.firstName} ${edited.lastName}` },
        salutation: { actual: scalar(lead.salutation), expected: salutation.id },
      });
      expect(storedContacts(lead.secondary_emails).map(normalize.caseInsensitive)).toContain(
        normalize.caseInsensitive(secondary.email),
      );
      expect(storedContacts(lead.secondary_phones).map(normalize.phone)).toContain(normalize.phone(secondary.phone));
    });

    await step("Flow: the new secondary email and phone each retrieve this same lead", async () => {
      const byEmail = await new LeadsApi().retrieveWhenExists(secondary.email);
      const byPhone = await new LeadsApi().retrieveWhenExists(secondary.phone);
      expect(byEmail.lead?.id).toBe(owned.leadId);
      expect(byPhone.lead?.id).toBe(owned.leadId);
    });
  });
});

function scalar(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    const row = value as Record<string, unknown>;
    return String(row.id ?? row.value ?? row.text ?? "");
  }
  return "";
}

/** Strings, or email / phone fields, from a retrieve_lead contact list. */
function storedContacts(value: unknown): string[] {
  const rows = Array.isArray(value) ? value : value == null || value === "" ? [] : [value];
  return rows.flatMap((item) => {
    if (typeof item === "string" || typeof item === "number") return [String(item)];
    if (item && typeof item === "object") {
      const row = item as Record<string, unknown>;
      return [row.email, row.ph_number, row.phone, row.value].flatMap((part) =>
        part == null || part === "" ? [] : [String(part)],
      );
    }
    return [];
  });
}
