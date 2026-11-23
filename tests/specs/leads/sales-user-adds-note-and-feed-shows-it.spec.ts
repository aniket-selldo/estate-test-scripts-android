import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { LeadProfileApi } from "../../../src/api/LeadProfileApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { UserRole, UsersApi } from "../../../src/api/UsersApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { createOwnedLead } from "../../../src/data/LeadSetup.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { findLead } from "../../../src/flows/leads.flow.ts";
import { LeadDetailScreen } from "../../../src/screens/leads/LeadDetail.screen.ts";

/**
 * LEAD-009 Sales user adds a note on a lead and the Notes feed shows it.
 *
 * Preconditions: an active sales user and a lead assigned to that user.
 * Under test: Add note (POST /api/v3/client/leads/:id/notes).
 * Read back: GET /client/leads/:id/activities.json?filters[_type]=Note.
 * The note title on the conversation card is the plain text of the note.
 */
describe("Leads | Add note", () => {
  it("@regression @leads LEAD-009 Sales user adds a note and the Notes feed shows the same text", async () => {
    await addFeature("Leads");
    await addStory("Add a note from the lead");
    await addSeverity("critical");
    await addTestId("LEAD-009");

    const salesUser = await step("API: get an active sales user", () => new UsersApi().firstActiveUser(UserRole.Sales));
    const owned = await step("API: create a lead assigned to that user", () => createOwnedLead(salesUser));
    const token = await step("API: sign in as the sales user", () =>
      new SessionApi().accessToken(salesUser.email, settings.credentials.userPassword),
    );
    const profile = new LeadProfileApi(token);
    await step("API: the lead allows a note", async () => {
      const access = await profile.access(owned.leadId);
      expect(access.note).toBe(true);
    });
    const note = `Appium note ${Date.now().toString(36)}`;

    await loginAs(salesUser.email, settings.credentials.userPassword);
    const detail = await findLead(owned.lead.email, `${owned.lead.firstName} ${owned.lead.lastName}`);
    const form = await detail.openAddNote();
    await form.enterNote(note);
    const outcome = await form.save();

    await step("UI: Add note closes and confirms the note was added", async () => {
      attachJson("Save outcome", outcome);
      expect(outcome.errors).toEqual([]);
      expect(outcome.formClosed).toBe(true);
      expect(outcome.successMessage).toMatch(/Note added successfully/i);
    });

    await step("UI: the Notes tab shows the note text", async () => {
      const screen = await new LeadDetailScreen().waitUntilShown();
      await screen.showNotes();
      const feed = await screen.waitForText(note);
      expect(feed).toContain(note.toLowerCase());
    });

    await step("API: the note activity stores the same text", async () => {
      const saved = await profile.recordWhen(owned.leadId, "Note", (fields) => String(fields.content ?? "").includes(note));
      expect(String(saved.fields.content ?? "")).toContain(note);
    });
  });
});
