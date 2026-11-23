import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { ClientConfigApi } from "../../../src/api/ClientConfigApi.ts";
import { currentProjectIds, LeadsApi } from "../../../src/api/LeadsApi.ts";
import { LeadProfileApi } from "../../../src/api/LeadProfileApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { UserRole, UsersApi } from "../../../src/api/UsersApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { ClientConfigData } from "../../../src/data/ClientConfigData.ts";
import { pushTarget } from "../../../src/data/LeadProfileData.ts";
import { createOwnedLead } from "../../../src/data/LeadSetup.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { findLead } from "../../../src/flows/leads.flow.ts";

/**
 * LEAD-006 Pre-sales pushes a lead that is not incoming and already has a project.
 *
 * PushToSales.perform (app/tasks/push_to_sales.rb) rejects a lead that is already in sales,
 * has no interested project, or is still in the incoming stage. This case clears those three.
 *
 * Preconditions:
 *   - an active pre-sales user                 GET  /client/users.json
 *   - a lead assigned to them, with a project  POST /api/leads/create
 *   - stage moved off incoming when needed     PATCH /api/v3/client/leads/:id/stage
 *   - push_lead_strategy and auto_forward      GET  /api/v3/client/pre_sales_configuration
 *
 * Under test (the app):
 *   - Push                                 POST /api/v3/client/leads/:id/push_to_sales
 *
 * Verification:
 *   - currently_in is sales and the owner changed    GET /api/leads/email/retrieve_lead
 *   - feed_type push_to_sales                         GET /client/leads/:id/activities.json
 */
describe("Lead actions | Push to sales", () => {
  it("@regression @leads LEAD-006 Pre-sales user pushes a qualified lead with a project into sales", async () => {
    await addFeature("Lead actions");
    await addStory("Push a qualified lead to sales");
    await addSeverity("critical");
    await addTestId("LEAD-006");

    const presales = await step("API: get an active pre-sales user", () => new UsersApi().firstActiveUser(UserRole.PreSales));
    const project = await step("API: pick a project", () => ClientConfigData.firstProject());
    const owned = await step("API: create a lead for that user with the project", () =>
      createOwnedLead(presales, project.id),
    );
    const token = await step("API: sign in as the pre-sales user", () =>
      new SessionApi().accessToken(presales.email, settings.credentials.userPassword),
    );
    const profile = new LeadProfileApi(token);
    const qualified = await step("API: move the lead off the incoming stage", async () => {
      const form = await profile.stageForm(owned.leadId);
      if (form.current !== "incoming" && form.current !== "") return form.current;
      const stage = profile.movableStage(form, ["incoming"]);
      await profile.changeStage(owned.leadId, stage);
      return stage.id;
    });
    await step("API: the lead has the interested project", async () => {
      if (owned.projectIds.includes(project.id)) return;
      await profile.addProject(owned.leadId, project.id, owned.lead);
      const saved = await new LeadsApi().retrieveWhenExists(owned.lead.email);
      expect(currentProjectIds(saved.lead)).toContain(project.id);
    });
    const push = await step("API: read how Push to sales is configured", () => new ClientConfigApi().pushSettings(token));
    const target = await step("API: pick the team or project the form will offer", () =>
      pushTarget(profile, push.byProject, push.byProject ? project.id : ""),
    );
    if (!push.autoForward && !target.user) {
      throw new Error("Push to sales asks for a sales person, and no sales user is available for the chosen group");
    }
    attachJson("Push setup", { qualified, project: project.id, push, group: target.group, user: target.user });

    await loginAs(presales.email, settings.credentials.userPassword);
    const detail = await findLead(owned.lead.email, `${owned.lead.firstName} ${owned.lead.lastName}`);
    const form = await (await detail.openMore()).pushToSales();
    const outcome = await form.push({
      byProject: push.byProject,
      group: target.group.text,
      salesPerson: push.autoForward ? "" : (target.user?.text ?? ""),
    });

    await step("UI: Push to sales closes the form and confirms the push", async () => {
      attachJson("Save outcome", outcome);
      expect(outcome.errors).toEqual([]);
      expect(outcome.formClosed).toBe(true);
      expect(outcome.successMessage).toMatch(/pushed to sales/i);
    });

    await step("API: the lead is in sales and no longer owned by pre-sales", async () => {
      const saved = await new LeadsApi().retrieveWhenExists(owned.lead.email);
      expect(saved.lead?.currently_in).toBe("sales");
      expect(saved.sales_details?.id).not.toBe(presales._id);
      if (!push.autoForward) expect(saved.sales_details?.id).toBe(target.user?.id);
    });
    await step("API: the feed records push_to_sales", async () => {
      const feed = await profile.feedWhen(owned.leadId, (item) => item.feedType === "push_to_sales");
      expect(feed.feedType).toBe("push_to_sales");
      expect(feed.content).toMatch(/pushed to sales/i);
    });
  });
});
