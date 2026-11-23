import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { LeadsApi } from "../../../src/api/LeadsApi.ts";
import { LeadProfileApi } from "../../../src/api/LeadProfileApi.ts";
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
 * LEAD-003 Sales user changes the stage of a lead created through the API.
 *
 * Preconditions:
 *   - an active sales user                    GET  /client/users.json
 *   - a lead assigned to that user            POST /api/leads/create
 *   - a stage the sheet can save              GET  /api/v3/client/leads/:id/stage
 *     Booked opens bookings. Lost and unqualified need a reason, so both are skipped.
 *
 * Under test (the app):
 *   - change stage                            PATCH /api/v3/client/leads/:id/stage     Api::V3::Client::LeadStagesController#update
 *
 * Verification:
 *   - stored stage                            GET  /api/leads/email/retrieve_lead
 *   - conversation feed                       GET  /client/leads/:id/activities.json?filters[_type]=Feed
 *     feed_type `stage_change`, content "Lead stage was changed from {old} ({pipeline}) to {new} ({pipeline})."
 */
describe("Lead stages | Change stage", () => {
  it("@regression @leads LEAD-003 Sales user changes the lead stage and the feed records the new stage", async () => {
    await addFeature("Lead stages");
    await addStory("Sales user changes a lead stage");
    await addSeverity("critical");
    await addTestId("LEAD-003");

    const salesUser = await step("API: get an active sales user", () => new UsersApi().firstActiveUser(UserRole.Sales));
    const owned = await step("API: create a lead assigned to that user", () => createOwnedLead(salesUser));
    const token = await step("API: sign in as the sales user", () =>
      new SessionApi().accessToken(salesUser.email, settings.credentials.userPassword),
    );
    const profile = new LeadProfileApi(token);
    const next = await step("API: pick a stage the sheet can save", async () => {
      const form = await profile.stageForm(owned.leadId);
      const stage = profile.movableStage(form);
      const current = form.stages.find((item) => item.id === form.current);
      if (!current) throw new Error(`Current stage "${form.current}" is not on the stage form`);
      attachJson("Stage change", { from: current, to: stage, pipeline: form.pipeline });
      return { from: current, to: stage, pipeline: form.pipeline };
    });

    await loginAs(salesUser.email, settings.credentials.userPassword);
    const detail = await findLead(owned.lead.email, `${owned.lead.firstName} ${owned.lead.lastName}`);
    const sheet = await detail.openStage(next.from.text);
    const outcome = await sheet.changeTo(next.to.text, next.to.statuses[0] ?? "");

    await step("UI: Save closes Change stage and confirms the update", async () => {
      attachJson("Save outcome", outcome);
      expect(outcome.errors).toEqual([]);
      expect(outcome.formClosed).toBe(true);
      // V3::Leads::StageChange::NOTICE is "Lead updated successfully".
      expect(outcome.successMessage).toMatch(/Lead updated successfully/i);
    });

    const sentence = `Lead stage was changed from ${next.from.text} (${next.pipeline}) to ${next.to.text} (${next.pipeline}).`;
    await step("UI: the Feed tab shows the stage-change sentence", async () => {
      const screen = await new LeadDetailScreen().waitUntilShown();
      await screen.showFeed();
      const feed = await screen.waitForText(sentence);
      expect(feed).toContain(sentence.toLowerCase());
    });

    await step("API: retrieve_lead stores the new stage", async () => {
      const saved = await new LeadsApi().retrieveWhenExists(owned.lead.email);
      const stageData = saved.lead?.stage_data as { id?: string; value?: string } | undefined;
      expect(saved.lead?.id).toBe(owned.leadId);
      expect(stageData?.id ?? saved.lead?.stage).toBe(next.to.id);
    });

    await step("API: the conversation feed records a stage_change for that stage", async () => {
      const feed = await profile.feedWhen(
        owned.leadId,
        (item) => item.feedType === "stage_change" && item.content.includes(next.to.text),
      );
      expect(feed.feedType).toBe("stage_change");
      expect(normalize.caseInsensitive(feed.content)).toContain(normalize.caseInsensitive(sentence));
    });
  });
});
