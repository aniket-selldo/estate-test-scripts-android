import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { LeadProfileApi } from "../../../src/api/LeadProfileApi.ts";
import { LeadsApi } from "../../../src/api/LeadsApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { UserRole, UsersApi } from "../../../src/api/UsersApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { createOwnedLead } from "../../../src/data/LeadSetup.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { findLead } from "../../../src/flows/leads.flow.ts";
import { LeadsListScreen } from "../../../src/screens/leads/LeadsList.screen.ts";

/**
 * LEAD-012 An admin deletes a lead from the lead.
 *
 * Preconditions: an active admin and a lead assigned to that admin.
 * Under test: Delete lead, then Delete only
 * (DELETE /api/v3/client/leads/:id with export_before_delete false).
 * The sheet says "You are about to delete 1 lead."
 * Read back: GET /api/leads/email/retrieve_lead until exists is false.
 * Delete is queued, so the lookup can still find the lead for a short time.
 */
describe("Leads | Delete lead", () => {
  it("@regression @leads LEAD-012 Admin deletes a lead and the backend no longer returns it", async () => {
    await addFeature("Leads");
    await addStory("Admin deletes a lead");
    await addSeverity("critical");
    await addTestId("LEAD-012");

    const admin = await step("API: get an active admin", () => new UsersApi().firstActiveUser(UserRole.Admin));
    const owned = await step("API: create a lead assigned to that admin", () => createOwnedLead(admin));
    const token = await step("API: sign in as the admin", () =>
      new SessionApi().accessToken(admin.email, settings.credentials.userPassword),
    );
    await step("API: the admin is allowed to delete the lead", async () => {
      const access = await new LeadProfileApi(token).access(owned.leadId);
      expect(access.delete).toBe(true);
    });

    await loginAs(admin.email, settings.credentials.userPassword);
    const detail = await findLead(owned.lead.email, `${owned.lead.firstName} ${owned.lead.lastName}`);
    const sheet = await detail.openDelete();

    await step("UI: the confirmation is for this one lead", async () => {
      expect((await sheet.prompt()).toLowerCase()).toContain("you are about to delete 1 lead");
    });

    const outcome = await sheet.deleteOnly();
    await step("UI: Delete only closes the sheet and confirms the delete", async () => {
      attachJson("Delete outcome", outcome);
      expect(outcome.errors).toEqual([]);
      expect(outcome.formClosed).toBe(true);
      expect(outcome.successMessage).toMatch(/delet/i);
    });

    await step("Flow: the lead detail closes back to the leads list", async () => {
      await new LeadsListScreen().waitUntilShown();
    });

    await step("API: retrieve_lead no longer returns the lead", async () => {
      const gone = await new LeadsApi().retrieveUntilGone(owned.lead.email);
      expect(gone.exists).toBe(false);
    });
  });
});
