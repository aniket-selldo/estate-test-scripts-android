import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { ClientConfigApi } from "../../../src/api/ClientConfigApi.ts";
import { currentProjectIds, LeadsApi } from "../../../src/api/LeadsApi.ts";
import { LeadProfileApi, type StageOption } from "../../../src/api/LeadProfileApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { UserRole, UsersApi } from "../../../src/api/UsersApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { ClientConfigData } from "../../../src/data/ClientConfigData.ts";
import { pushTarget } from "../../../src/data/LeadProfileData.ts";
import { createOwnedLead } from "../../../src/data/LeadSetup.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { findLead } from "../../../src/flows/leads.flow.ts";

/** PushToSales.perform when stage == "incoming", even if a project is present. */
const INCOMING_BLOCK =
  "Please contact and validate the lead before pushing it to sales.";

/**
 * LEAD-007 Pre-sales cannot push a lead that is still incoming.
 * A project is on the lead, so the only failing rule is the incoming stage.
 *
 * Preconditions:
 *   - an active pre-sales user and a lead with a project
 *   - stage set to incoming                         PATCH /api/v3/client/leads/:id/stage
 *
 * Under test: Push to sales stays on the form and shows the incoming-stage error.
 * Verification: currently_in, owner and stage are unchanged.
 */
describe("Leads | Push to sales", () => {
  it("@regression @leads LEAD-007 Pre-sales user cannot push an incoming lead even when a project is added", async () => {
    await addFeature("Leads");
    await addStory("Push to sales rejects an incoming lead");
    await addSeverity("critical");
    await addTestId("LEAD-007");

    const presales = await step("API: get an active pre-sales user", () => new UsersApi().firstActiveUser(UserRole.PreSales));
    const project = await step("API: pick a project", () => ClientConfigData.firstProject());
    const owned = await step("API: create a lead for that user with the project", () =>
      createOwnedLead(presales, project.id),
    );
    const token = await step("API: sign in as the pre-sales user", () =>
      new SessionApi().accessToken(presales.email, settings.credentials.userPassword),
    );
    const profile = new LeadProfileApi(token);
    const incoming = await step("API: put the lead in the incoming stage", async () => {
      const form = await profile.stageForm(owned.leadId);
      const stage =
        form.stages.find((item) => item.id === "incoming") ??
        form.stages.find((item) => item.text.toLowerCase() === "incoming");
      if (!stage) throw new Error("This client has no incoming stage");
      if (form.current !== stage.id) await profile.changeStage(owned.leadId, stage);
      return stage;
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
    attachJson("Push setup", { incoming: incoming.id, project: project.id, push, group: target.group });

    await loginAs(presales.email, settings.credentials.userPassword);
    const detail = await findLead(owned.lead.email, `${owned.lead.firstName} ${owned.lead.lastName}`);
    const outcome = await (
      await (await detail.openMore()).pushToSales()
    ).push({
      byProject: push.byProject,
      group: target.group.text,
      salesPerson: push.autoForward ? "" : (target.user?.text ?? ""),
    });

    await step("UI: Push to sales stays open and shows the incoming-stage error", async () => {
      attachJson("Save outcome", outcome);
      expect(outcome.formClosed).toBe(false);
      expect([...outcome.errors, outcome.successMessage].join("\n")).toContain(INCOMING_BLOCK);
    });
    await step("API: stage, pipeline and owner are unchanged", async () => {
      const saved = await new LeadsApi().retrieve(owned.lead.email);
      expect(saved.lead?.stage ?? stageId(saved.lead?.stage_data)).toBe(incoming.id);
      expect(saved.lead?.currently_in).not.toBe("sales");
      expect(saved.sales_details?.id).toBe(presales._id);
    });
  });
});

function stageId(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  return String((value as StageOption).id ?? "");
}
