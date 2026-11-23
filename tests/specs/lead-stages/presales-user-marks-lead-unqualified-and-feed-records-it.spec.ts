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
 * LEAD-014 Pre-sales user marks a lead unqualified.
 *
 * Unqualified is a pre-sales drop-off and needs a stage-change reason from the
 * stage form. A new lead assigned to a pre-sales user stays on that pipeline.
 *
 * Preconditions:
 *   - an active pre-sales user                 GET  /client/users.json
 *   - a new incoming lead assigned to them     POST /api/leads/create
 *   - Unqualified and an enabled reason        GET  /api/v3/client/leads/:id/stage
 *
 * Under test (the app):
 *   - mark unqualified                        PATCH /api/v3/client/leads/:id/stage
 *
 * Verification:
 *   - stored stage is unqualified             GET  /api/leads/email/retrieve_lead
 *   - feed_type stage_change, plus Reason     GET  /client/leads/:id/activities.json?filters[_type]=Feed
 */
describe("Lead stages | Mark unqualified", () => {
  it("@regression @leads LEAD-014 Pre-sales user marks a lead unqualified and the feed records the reason", async () => {
    await addFeature("Lead stages");
    await addStory("Pre-sales user marks a lead unqualified");
    await addSeverity("critical");
    await addTestId("LEAD-014");

    const presales = await step("API: get an active pre-sales user", () => new UsersApi().firstActiveUser(UserRole.PreSales));
    const owned = await step("API: create an incoming lead assigned to that user", () => createOwnedLead(presales));
    const token = await step("API: sign in as the pre-sales user", () =>
      new SessionApi().accessToken(presales.email, settings.credentials.userPassword),
    );
    const profile = new LeadProfileApi(token);
    const next = await step("API: pick Unqualified and a stage-change reason", async () => {
      const form = await profile.stageForm(owned.leadId);
      if (form.pipeline !== "pre_sales") {
        throw new Error(`Lead is on the ${form.pipeline} pipeline. Unqualified is marked from pre-sales.`);
      }
      const from = form.stages.find((item) => item.id === form.current);
      if (!from) throw new Error(`Current stage "${form.current}" is not on the stage form`);
      const unqualified = profile.dropOffStage(form, "unqualified");
      const reason = unqualified.reasons[0];
      if (!reason) throw new Error(`Stage "${unqualified.text}" has no enabled stage-change reason`);
      attachJson("Mark unqualified", { from, to: unqualified, reason, pipeline: form.pipeline });
      return { from, unqualified, reason, pipeline: form.pipeline, status: unqualified.statuses[0] ?? "" };
    });

    await loginAs(presales.email, settings.credentials.userPassword);
    const detail = await findLead(owned.lead.email, `${owned.lead.firstName} ${owned.lead.lastName}`);
    const sheet = await detail.openStage(next.from.text);
    const outcome = await sheet.changeTo(
      next.unqualified.text,
      next.status,
      next.reason.text,
      next.unqualified.qualifiedAsCp,
    );

    await step("UI: Save closes Change stage and confirms the update", async () => {
      attachJson("Save outcome", outcome);
      expect(outcome.errors).toEqual([]);
      expect(outcome.formClosed).toBe(true);
      expect(outcome.successMessage).toMatch(/Lead updated successfully/i);
    });

    const sentence = stageSentence(next.from.text, next.unqualified.text, next.pipeline, next.status);
    await step("UI: the Feed tab shows the stage change and the reason", async () => {
      const screen = await new LeadDetailScreen().waitUntilShown();
      await screen.showFeed();
      const feed = await screen.waitForText(sentence);
      expect(feed).toContain(sentence.toLowerCase());
      expect(feed).toContain(`reason: ${next.reason.text}`.toLowerCase());
    });

    await step("API: retrieve_lead stores unqualified", async () => {
      const saved = await new LeadsApi().retrieveWhenExists(owned.lead.email);
      const stageData = saved.lead?.stage_data as { id?: string } | undefined;
      expect(saved.lead?.id).toBe(owned.leadId);
      expect(stageData?.id ?? saved.lead?.stage).toBe("unqualified");
    });

    await step("API: the conversation feed records the unqualified stage and the reason", async () => {
      const feed = await profile.feedWhen(
        owned.leadId,
        (item) =>
          item.feedType === "stage_change" && item.content.toLowerCase().includes(next.unqualified.text.toLowerCase()),
      );
      expect(feed.feedType).toBe("stage_change");
      expect(normalize.caseInsensitive(feed.content)).toContain(normalize.caseInsensitive(sentence));
      expect(normalize.caseInsensitive(feed.content)).toContain(normalize.caseInsensitive(`Reason: ${next.reason.text}`));
    });
  });
});

function stageSentence(from: string, to: string, pipeline: string, status: string): string {
  const department = pipeline
    .split("_")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join("-");
  const target = status ? `${to} - ${status}` : to;
  return `Lead stage was changed from ${from} (${department}) to ${target} (${department}).`;
}
