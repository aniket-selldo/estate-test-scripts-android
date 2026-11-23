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
 * LEAD-013 Sales user marks a lead lost.
 *
 * Lost needs a stage-change reason. The reason comes from the stage form
 * (`reasons` on the lost stage). The sheet blocks Save when that list is empty.
 *
 * Preconditions:
 *   - an active sales user                    GET  /client/users.json
 *   - a new incoming lead assigned to them    POST /api/leads/create
 *   - Lost and an enabled drop-off reason     GET  /api/v3/client/leads/:id/stage
 *
 * Under test (the app):
 *   - mark lost                               PATCH /api/v3/client/leads/:id/stage
 *
 * Verification:
 *   - stored stage is lost                    GET  /api/leads/email/retrieve_lead
 *   - feed_type stage_change, plus Reason     GET  /client/leads/:id/activities.json?filters[_type]=Feed
 */
describe("Lead stages | Mark lost", () => {
  it("@regression @leads LEAD-013 Sales user marks a lead lost and the feed records the reason", async () => {
    await addFeature("Lead stages");
    await addStory("Sales user marks a lead lost");
    await addSeverity("critical");
    await addTestId("LEAD-013");

    const salesUser = await step("API: get an active sales user", () => new UsersApi().firstActiveUser(UserRole.Sales));
    const owned = await step("API: create an incoming lead assigned to that user", () => createOwnedLead(salesUser));
    const token = await step("API: sign in as the sales user", () =>
      new SessionApi().accessToken(salesUser.email, settings.credentials.userPassword),
    );
    const profile = new LeadProfileApi(token);
    const next = await step("API: pick Lost and a stage-change reason", async () => {
      const form = await profile.stageForm(owned.leadId);
      const from = form.stages.find((item) => item.id === form.current);
      if (!from) throw new Error(`Current stage "${form.current}" is not on the stage form`);
      const lost = profile.dropOffStage(form, "lost");
      const reason = lost.reasons[0];
      if (!reason) throw new Error(`Stage "${lost.text}" has no enabled stage-change reason`);
      attachJson("Mark lost", { from, to: lost, reason, pipeline: form.pipeline });
      return { from, lost, reason, pipeline: form.pipeline, status: lost.statuses[0] ?? "" };
    });

    await loginAs(salesUser.email, settings.credentials.userPassword);
    const detail = await findLead(owned.lead.email, `${owned.lead.firstName} ${owned.lead.lastName}`);
    const sheet = await detail.openStage(next.from.text);
    const outcome = await sheet.changeTo(next.lost.text, next.status, next.reason.text, next.lost.qualifiedAsCp);

    await step("UI: Save closes Change stage and confirms the update", async () => {
      attachJson("Save outcome", outcome);
      expect(outcome.errors).toEqual([]);
      expect(outcome.formClosed).toBe(true);
      expect(outcome.successMessage).toMatch(/Lead updated successfully/i);
    });

    const sentence = stageSentence(next.from.text, next.lost.text, next.pipeline, next.status);
    await step("UI: the Feed tab shows the stage change and the reason", async () => {
      const screen = await new LeadDetailScreen().waitUntilShown();
      await screen.showFeed();
      const feed = await screen.waitForText(sentence);
      expect(feed).toContain(sentence.toLowerCase());
      expect(feed).toContain(`reason: ${next.reason.text}`.toLowerCase());
    });

    await step("API: retrieve_lead stores lost", async () => {
      const saved = await new LeadsApi().retrieveWhenExists(owned.lead.email);
      const stageData = saved.lead?.stage_data as { id?: string } | undefined;
      expect(saved.lead?.id).toBe(owned.leadId);
      expect(stageData?.id ?? saved.lead?.stage).toBe("lost");
    });

    await step("API: the conversation feed records the lost stage and the reason", async () => {
      const feed = await profile.feedWhen(
        owned.leadId,
        (item) => item.feedType === "stage_change" && item.content.toLowerCase().includes(next.lost.text.toLowerCase()),
      );
      expect(feed.feedType).toBe("stage_change");
      expect(normalize.caseInsensitive(feed.content)).toContain(normalize.caseInsensitive(sentence));
      expect(normalize.caseInsensitive(feed.content)).toContain(normalize.caseInsensitive(`Reason: ${next.reason.text}`));
    });
  });
});

/** FeedWorkflow writes "Sales" or "Pre-Sales", and appends " - {status}" when a status was chosen. */
function stageSentence(from: string, to: string, pipeline: string, status: string): string {
  const department = pipeline
    .split("_")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join("-");
  const target = status ? `${to} - ${status}` : to;
  return `Lead stage was changed from ${from} (${department}) to ${target} (${department}).`;
}
