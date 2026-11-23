import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { LeadProfileApi } from "../../../src/api/LeadProfileApi.ts";
import { LeadsApi } from "../../../src/api/LeadsApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { UserRole, UsersApi } from "../../../src/api/UsersApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { normalize } from "../../../src/core/normalize.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { createOwnedLead } from "../../../src/data/LeadSetup.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { findLead } from "../../../src/flows/leads.flow.ts";
import { LeadDetailScreen } from "../../../src/screens/leads/LeadDetail.screen.ts";

/**
 * LEAD-010 Sales user merges a duplicate into the open lead.
 *
 * Preconditions: an active sales user and two leads assigned to that user.
 * Under test: Merge lead (POST /api/v3/client/leads/:id/merge_leads).
 * The form keeps the open lead's name, email and phone unless a conflict is changed.
 * Read back: GET /client/leads/:id/activities.json?filters[_type]=Feed
 * and GET /api/leads/email/retrieve_lead.
 * The merge keeps the open lead and records a lead_updated feed when the
 * duplicate email is added as a secondary email.
 */
describe("Lead actions | Merge lead", () => {
  it("@regression @leads LEAD-010 Sales user merges a duplicate lead and the feed names that lead", async () => {
    await addFeature("Lead actions");
    await addStory("Merge a duplicate into the open lead");
    await addSeverity("critical");
    await addTestId("LEAD-010");

    const salesUser = await step("API: get an active sales user", () => new UsersApi().firstActiveUser(UserRole.Sales));
    const kept = await step("API: create the lead that stays", () => createOwnedLead(salesUser));
    const duplicate = await step("API: create the lead that is merged in", () => createOwnedLead(salesUser));
    const token = await step("API: sign in as the sales user", () =>
      new SessionApi().accessToken(salesUser.email, settings.credentials.userPassword),
    );
    const profile = new LeadProfileApi(token);
    await step("API: the open lead can be merged", async () => {
      const access = await profile.access(kept.leadId);
      expect(access.merge).toBe(true);
    });
    const duplicateName = `${duplicate.lead.firstName} ${duplicate.lead.lastName}`;
    const notes = `Appium merge ${Date.now().toString(36)}`;

    await loginAs(salesUser.email, settings.credentials.userPassword);
    const detail = await findLead(kept.lead.email, `${kept.lead.firstName} ${kept.lead.lastName}`);
    const form = await detail.openMerge();
    await form.chooseLead(duplicateName);

    await step("UI: Lead to merge shows the duplicate", async () => {
      expect((await form.shownLeadToMerge()).toLowerCase()).toContain(duplicateName.toLowerCase());
    });

    await form.enterNotes(notes);
    const outcome = await form.merge();

    await step("UI: Merge closes and says the merge is scheduled", async () => {
      attachJson("Merge outcome", outcome);
      expect(outcome.errors).toEqual([]);
      expect(outcome.formClosed).toBe(true);
      expect(outcome.successMessage).toMatch(/Lead merge is scheduled successfully/i);
    });

    await step("API: the kept lead still has the email that was entered for it", async () => {
      const saved = await new LeadsApi().retrieveWhenExists(kept.lead.email);
      expect(saved.lead?.id).toBe(kept.leadId);
      expect(normalize.caseInsensitive(String(saved.lead?.email ?? ""))).toBe(normalize.caseInsensitive(kept.lead.email));
    });

    await step("API: the feed records the duplicate email on the kept lead", async () => {
      const feed = await profile.recordWhen(kept.leadId, "Feed", (fields) =>
        String(fields.content ?? "").toLowerCase().includes(duplicate.lead.email.toLowerCase()),
      );
      expect(String(feed.fields.feed_type ?? "")).toBe("lead_updated");
      expect(String(feed.fields.content ?? "").toLowerCase()).toContain(duplicate.lead.email.toLowerCase());
    });

    await step("UI: the Feed tab shows the duplicate email was added", async () => {
      const screen = await new LeadDetailScreen().waitUntilShown();
      await screen.showFeed();
      const feed = await screen.waitForText(duplicate.lead.email);
      expect(feed).toContain(duplicate.lead.email.toLowerCase());
    });
  });
});
