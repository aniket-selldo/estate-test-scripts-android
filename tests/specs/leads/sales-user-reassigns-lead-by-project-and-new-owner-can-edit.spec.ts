import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { ClientConfigApi } from "../../../src/api/ClientConfigApi.ts";
import { LeadsApi } from "../../../src/api/LeadsApi.ts";
import { LeadProfileApi } from "../../../src/api/LeadProfileApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { UserRole, UsersApi } from "../../../src/api/UsersApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { reassignTarget } from "../../../src/data/LeadProfileData.ts";
import { createOwnedLead } from "../../../src/data/LeadSetup.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { findLead } from "../../../src/flows/leads.flow.ts";
import { HomeScreen } from "../../../src/screens/home/Home.screen.ts";
import { EditLeadScreen } from "../../../src/screens/leads/EditLead.screen.ts";
import { LeadDetailScreen } from "../../../src/screens/leads/LeadDetail.screen.ts";

/**
 * LEAD-005 Reassign by project, then the new owner can edit the lead.
 *
 * Preconditions:
 *   - client reassign_lead_strategy set to project  PATCH /api/v3/client/client_configuration
 *     The previous value is restored at the end of the test.
 *   - a sales user and a lead they own               POST  /api/leads/create
 *   - a project and another sales user on it         GET   /api/v3/client/users/lookups?provider=reassign_lead
 *
 * Under test (the app):
 *   - reassign as the current owner                  PUT /api/v3/client/leads/:id/reassign
 *   - Edit lead as the new owner
 *
 * Verification:
 *   - new owner                                      GET /api/leads/email/retrieve_lead  sales_details.id
 *   - feed                                           feed_type reassign
 *   - previous owner                                 GET /api/v3/client/leads/:id  isMine false, actions.edit false
 *   - new owner                                      GET /api/v3/client/leads/:id  isMine true, actions.edit true
 *   - Edit lead opens for the new owner
 */
describe("Leads | Reassign by project", () => {
  it("@regression @leads LEAD-005 Sales user reassigns a lead by project and the new owner can edit it", async () => {
    await addFeature("Leads");
    await addStory("Reassign a lead by project");
    await addSeverity("critical");
    await addTestId("LEAD-005");

    const config = new ClientConfigApi();
    const admin = await step("API: get an active admin", () => new UsersApi().firstActiveUser(UserRole.Admin));
    const adminToken = await step("API: sign in as the admin", () =>
      new SessionApi().accessToken(admin.email, settings.credentials.userPassword),
    );
    const previous = await step("API: read reassign_lead_strategy", () => config.reassignStrategy(adminToken));
    let failed: unknown;
    try {
      await step("API: set reassign_lead_strategy to project", async () => {
        await config.setReassignStrategy(adminToken, "project");
        expect(await config.reassignStrategy(adminToken)).toBe("project");
      });

      const owner = await step("API: get an active sales user", () => new UsersApi().firstActiveUser(UserRole.Sales));
      const owned = await step("API: create a lead assigned to that user", () => createOwnedLead(owner));
      const ownerToken = await step("API: sign in as the owner", () =>
        new SessionApi().accessToken(owner.email, settings.credentials.userPassword),
      );
      const ownerProfile = new LeadProfileApi(ownerToken);
      const target = await step("API: pick a project and another sales user on it", () =>
        reassignTarget(ownerProfile, "project", owner),
      );
      attachJson("Reassign target", {
        strategy: "project",
        group: target.group,
        user: target.user.email,
        reason: target.reason?.text ?? "",
      });

      await loginAs(owner.email, settings.credentials.userPassword);
      const detail = await findLead(owned.lead.email, `${owned.lead.firstName} ${owned.lead.lastName}`);
      const outcome = await (
        await (await detail.openMore()).reassignLead()
      ).reassign({
        strategy: "project",
        group: target.group.text,
        user: target.userLabel,
        reason: target.reason?.text ?? "",
      });

      await step("UI: Reassign closes the form and confirms the move", async () => {
        attachJson("Save outcome", outcome);
        expect(outcome.errors).toEqual([]);
        expect(outcome.formClosed).toBe(true);
        expect(outcome.successMessage).toMatch(/Lead reassigned successfully/i);
      });
      await step("API: the lead is owned by the user who was picked", async () => {
        const saved = await new LeadsApi().retrieveWhenExists(owned.lead.email);
        expect(saved.sales_details?.id).toBe(target.user._id);
      });
      await step("API: the feed records the reassignment", async () => {
        const feed = await ownerProfile.feedWhen(owned.leadId, (item) => item.feedType === "reassign");
        expect(feed.feedType).toBe("reassign");
        expect(feed.content).toMatch(/reassigned/i);
      });
      const lost = await step("API: the previous owner is no longer allowed to edit", () => ownerProfile.access(owned.leadId));
      await step("API: isMine and edit are false for the previous owner", async () => {
        attachJson("Previous owner access", lost);
        expect(lost.isMine).toBe(false);
        expect(lost.edit).toBe(false);
        expect(lost.salesId).toBe(target.user._id);
      });
      await step("UI: the lead shows the access message returned by the API", async () => {
        const shown = await new LeadDetailScreen().waitUntilShown().then((screen) => screen.shownText());
        const lines = lost.messages.flatMap((message) => message.split("\n")).map((line) => line.trim()).filter(Boolean);
        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines) expect(shown).toContain(line);
      });

      await (await new LeadDetailScreen().waitUntilShown()).backToList();
      await new HomeScreen().logout();

      const newToken = await step("API: sign in as the new owner", () =>
        new SessionApi().accessToken(target.user.email, settings.credentials.userPassword),
      );
      await loginAs(target.user.email, settings.credentials.userPassword);
      const access = await step("API: the new owner is allowed to edit", () =>
        new LeadProfileApi(newToken).access(owned.leadId),
      );
      await step("API: isMine and edit are true for the new owner", async () => {
        attachJson("New owner access", access);
        expect(access.isMine).toBe(true);
        expect(access.edit).toBe(true);
        expect(access.salesId).toBe(target.user._id);
      });
      await step("UI: Edit lead opens for the new owner", async () => {
        const lead = await findLead(owned.lead.email, `${owned.lead.firstName} ${owned.lead.lastName}`);
        await (await lead.openMore()).editLead();
        await new EditLeadScreen().waitUntilShown();
      });
    } catch (error) {
      failed = error;
    }

    try {
      await step(`API: restore reassign_lead_strategy to ${previous}`, () =>
        config.setReassignStrategy(adminToken, previous),
      );
    } catch (restoreError) {
      if (failed) throw new Error(`${String(failed)}\nAlso failed to restore reassign_lead_strategy: ${String(restoreError)}`);
      throw restoreError;
    }
    if (failed) throw failed;
  });
});
