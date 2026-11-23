import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { LeadsApi } from "../../../src/api/LeadsApi.ts";
import { LeadProfileApi } from "../../../src/api/LeadProfileApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { UserRole, UsersApi } from "../../../src/api/UsersApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { normalize } from "../../../src/core/normalize.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { createIncomingLeads } from "../../../src/data/LeadSetup.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { searchAndBulkChangeStage } from "../../../src/flows/leads.flow.ts";
import { LeadDetailScreen } from "../../../src/screens/leads/LeadDetail.screen.ts";

/**
 * LEAD-015 Admin bulk-changes the stage of five new leads.
 *
 * Each lead is created through the API and starts at incoming. They share one
 * last name, so search returns only that set. The bulk target is never
 * incoming: BulkModifyLeadsStageWorker skips a lead whose stage does not change.
 *
 * Preconditions:
 *   - an active admin and a sales user         GET  /client/users.json
 *   - five incoming leads for that sales user  POST /api/leads/create
 *   - a non-incoming bulk stage                 GET  /api/v3/client/lead_bulk_stage_changes/new
 *
 * Under test (the app):
 *   - search, select all, change stage         POST /api/v3/client/lead_bulk_stage_changes
 *
 * Verification:
 *   - the list count is 5 and all five are selected
 *   - each lead stores the new stage           GET  /api/leads/email/retrieve_lead
 *   - each feed records stage_change           GET  /client/leads/:id/activities.json?filters[_type]=Feed
 */
describe("Lead stages | Bulk stage change", () => {
  it("@regression @leads LEAD-015 Admin bulk-changes the stage of five searched leads and each feed records it", async () => {
    await addFeature("Lead stages");
    await addStory("Admin bulk-changes lead stage");
    await addSeverity("critical");
    await addTestId("LEAD-015");

    const admin = await step("API: get an active admin", () => new UsersApi().firstActiveUser(UserRole.Admin));
    const salesUser = await step("API: get an active sales user", () => new UsersApi().firstActiveUser(UserRole.Sales));
    const created = await step("API: create five incoming leads that share one last name", () =>
      createIncomingLeads(salesUser, 5),
    );
    const token = await step("API: sign in as the admin", () =>
      new SessionApi().accessToken(admin.email, settings.credentials.userPassword),
    );
    const profile = new LeadProfileApi(token);
    const next = await step("API: pick a bulk stage that is not incoming", async () => {
      const form = await profile.stageForm(created.leads[0].leadId);
      const from = form.stages.find((item) => item.id === form.current);
      if (!from) throw new Error(`Current stage "${form.current}" is not on the stage form`);
      if (form.current !== "incoming") throw new Error(`Lead stage is "${form.current}", expected incoming`);
      const target = profile.bulkTarget(await profile.bulkStageForm(), form.pipeline);
      attachJson("Bulk stage", { query: created.query, from, target });
      return { from, target, pipeline: form.pipeline };
    });
    const names = created.leads.map((owned) => `${owned.lead.firstName} ${owned.lead.lastName}`);

    await loginAs(admin.email, settings.credentials.userPassword);
    const run = await searchAndBulkChangeStage({
      query: created.query,
      names,
      pipeline: next.target.pipelineLabel,
      stage: next.target.stageLabel,
      status: next.target.status,
      reason: next.target.reason,
    });

    await step("UI: the search lists only the five new leads and all five are selected", async () => {
      const listed = run.listText.toLowerCase();
      expect(listed).toContain("(5)");
      for (const name of names) expect(listed).toContain(name.toLowerCase());
      expect(run.selectedText).toBe("5 selected");
    });

    await step("UI: Change stage confirms the bulk update started", async () => {
      attachJson("Save outcome", run.outcome);
      expect(run.outcome.errors).toEqual([]);
      expect(run.outcome.formClosed).toBe(true);
      expect(run.outcome.successMessage).toMatch(/Bulk Lead Stage Change started in background/i);
    });

    const sentence = stageSentence(next.from.text, next.target.stageName, next.pipeline, next.target.status);
    await step("API: each lead stores the new stage and the feed records it", async () => {
      const leads = new LeadsApi();
      for (const owned of created.leads) {
        const feed = await profile.feedWhen(
          owned.leadId,
          (item) =>
            item.feedType === "stage_change" &&
            normalize.caseInsensitive(item.content).includes(normalize.caseInsensitive(sentence)),
          90_000,
        );
        expect(feed.feedType).toBe("stage_change");
        expect(normalize.caseInsensitive(feed.content)).toContain(normalize.caseInsensitive(sentence));
        const saved = await leads.retrieveWhenExists(owned.lead.email);
        const stageData = saved.lead?.stage_data as { id?: string } | undefined;
        expect(stageData?.id ?? saved.lead?.stage).toBe(next.target.stageId);
      }
    });

    await step("UI: the first lead's Feed tab shows the stage-change sentence", async () => {
      const screen = await new LeadDetailScreen().openFromList(names[0]);
      await screen.showFeed();
      const feed = await screen.waitForText(sentence);
      expect(feed).toContain(sentence.toLowerCase());
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
