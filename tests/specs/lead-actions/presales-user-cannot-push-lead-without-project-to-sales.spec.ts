import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { ClientConfigApi } from "../../../src/api/ClientConfigApi.ts";
import { currentProjectIds, LeadsApi } from "../../../src/api/LeadsApi.ts";
import { LeadProfileApi } from "../../../src/api/LeadProfileApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { UserRole, UsersApi } from "../../../src/api/UsersApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { pushTarget } from "../../../src/data/LeadProfileData.ts";
import { createOwnedLead } from "../../../src/data/LeadSetup.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { findLead } from "../../../src/flows/leads.flow.ts";

/** PushToSales.perform when the lead has no current project, even after the stage has moved on. */
const PROJECT_BLOCK = "Please add project(s) of interest before pushing the lead to sales.";

/**
 * LEAD-008 Pre-sales cannot push a lead that has no project.
 * The stage is moved off incoming first, so the only failing rule is the missing project.
 *
 * Preconditions:
 *   - an active pre-sales user and a lead created with no project
 *   - stage moved off incoming                       PATCH /api/v3/client/leads/:id/stage
 *
 * Under test: Push to sales stays on the form and shows the missing-project error.
 * Verification: the lead gains no project, stays out of sales, and keeps its owner.
 */
describe("Lead actions | Push to sales", () => {
  it("@regression @leads LEAD-008 Pre-sales user cannot push a lead that has no project", async () => {
    await addFeature("Lead actions");
    await addStory("Push to sales rejects a lead with no project");
    await addSeverity("critical");
    await addTestId("LEAD-008");

    const presales = await step("API: get an active pre-sales user", () => new UsersApi().firstActiveUser(UserRole.PreSales));
    const owned = await step("API: create a lead with no project", () => createOwnedLead(presales));
    await step("API: the new lead has no interested project", async () => {
      expect(owned.projectIds).toEqual([]);
      const saved = await new LeadsApi().retrieve(owned.lead.email);
      expect(currentProjectIds(saved.lead)).toEqual([]);
    });
    const token = await step("API: sign in as the pre-sales user", () =>
      new SessionApi().accessToken(presales.email, settings.credentials.userPassword),
    );
    const profile = new LeadProfileApi(token);
    const stage = await step("API: move the lead off the incoming stage", async () => {
      const form = await profile.stageForm(owned.leadId);
      if (form.current !== "incoming" && form.current !== "") return form.current;
      const next = profile.movableStage(form, ["incoming"]);
      await profile.changeStage(owned.leadId, next);
      return next.id;
    });
    const push = await step("API: read how Push to sales is configured", () => new ClientConfigApi().pushSettings(token));
    const target = await step("API: pick the team or project the form will offer", () =>
      pushTarget(profile, push.byProject, ""),
    );
    if (!push.autoForward && !target.user) {
      throw new Error("Push to sales asks for a sales person, and no sales user is available for the chosen group");
    }
    attachJson("Push setup", { stage, push, group: target.group });

    await loginAs(presales.email, settings.credentials.userPassword);
    const detail = await findLead(owned.lead.email, `${owned.lead.firstName} ${owned.lead.lastName}`);
    const outcome = await (
      await (await detail.openMore()).pushToSales()
    ).push({
      byProject: push.byProject,
      group: target.group.text,
      salesPerson: push.autoForward ? "" : (target.user?.text ?? ""),
    });

    await step("UI: Push to sales stays open and shows the missing-project error", async () => {
      attachJson("Save outcome", outcome);
      expect(outcome.formClosed).toBe(false);
      expect([...outcome.errors, outcome.successMessage].join("\n")).toContain(PROJECT_BLOCK);
    });
    await step("API: the lead is still out of sales, with the same owner and no project", async () => {
      const saved = await new LeadsApi().retrieve(owned.lead.email);
      expect(saved.lead?.currently_in).not.toBe("sales");
      expect(saved.sales_details?.id).toBe(presales._id);
      expect(currentProjectIds(saved.lead)).toEqual([]);
      expect(saved.lead?.stage ?? "").not.toBe("incoming");
    });
  });
});
