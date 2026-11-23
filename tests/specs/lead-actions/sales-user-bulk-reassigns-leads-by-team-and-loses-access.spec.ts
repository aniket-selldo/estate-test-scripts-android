import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { ClientConfigApi } from "../../../src/api/ClientConfigApi.ts";
import { sleep } from "../../../src/api/HttpClient.ts";
import { LeadsApi } from "../../../src/api/LeadsApi.ts";
import { LeadProfileApi } from "../../../src/api/LeadProfileApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { UserRole, UsersApi } from "../../../src/api/UsersApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { reassignTarget } from "../../../src/data/LeadProfileData.ts";
import { createIncomingLeads } from "../../../src/data/LeadSetup.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { searchAndBulkReassign } from "../../../src/flows/leads.flow.ts";
import { HomeScreen } from "../../../src/screens/home/Home.screen.ts";
import { EditLeadScreen } from "../../../src/screens/leads/EditLead.screen.ts";
import { LeadDetailScreen } from "../../../src/screens/leads/LeadDetail.screen.ts";
import { LeadsListScreen } from "../../../src/screens/leads/LeadsList.screen.ts";

const LEAD_COUNT = 5;

/**
 * LEAD-017 Sales user bulk-reassigns five leads by team.
 *
 * Simple reassignment sends every selected lead to one other person on the
 * owner's team. The five leads share a last name, so search returns only that set.
 * The job runs in the background.
 *
 * Preconditions:
 *   - client reassign_lead_strategy set to team   PATCH /api/v3/client/client_configuration
 *     The previous value is restored at the end of the test.
 *   - five incoming leads owned by a sales user   POST  /api/leads/create
 *   - another sales user on that owner's team     GET   /api/v3/client/users/lookups?provider=reassign_lead
 *
 * Under test (the app, as the current owner):
 *   - bulk reassign                           POST /api/v3/client/lead_bulk_reassignments
 *
 * Verification:
 *   - each lead's owner                      GET /api/leads/email/retrieve_lead  sales_details.id
 *   - each feed                              feed_type reassign
 *   - previous owner                         GET /api/v3/client/leads/:id  isMine false, actions.edit false
 *   - the previous owner's search no longer lists the leads
 *   - new owner                              isMine true, actions.edit true, and Edit lead opens
 */
describe("Lead actions | Bulk reassign by team", () => {
  it("@regression @leads LEAD-017 Sales user bulk-reassigns leads by team and loses access to them", async () => {
    await addFeature("Lead actions");
    await addStory("Bulk reassign leads by team");
    await addSeverity("critical");
    await addTestId("LEAD-017");

    const config = new ClientConfigApi();
    const admin = await step("API: get an active admin", () => new UsersApi().firstActiveUser(UserRole.Admin));
    const adminToken = await step("API: sign in as the admin", () =>
      new SessionApi().accessToken(admin.email, settings.credentials.userPassword),
    );
    const previous = await step("API: read reassign_lead_strategy", () => config.reassignStrategy(adminToken));
    let failed: unknown;
    try {
      await step("API: set reassign_lead_strategy to team", async () => {
        await config.setReassignStrategy(adminToken, "team");
        expect(await config.reassignStrategy(adminToken)).toBe("team");
      });

      const owner = await step("API: get an active sales user", () => new UsersApi().firstActiveUser(UserRole.Sales));
      const created = await step("API: create five incoming leads that share one last name", () =>
        createIncomingLeads(owner, LEAD_COUNT),
      );
      const ownerToken = await step("API: sign in as the owner", () =>
        new SessionApi().accessToken(owner.email, settings.credentials.userPassword),
      );
      const ownerProfile = new LeadProfileApi(ownerToken);
      const target = await step("API: pick another sales user on the owner's team", () =>
        reassignTarget(ownerProfile, "team", owner),
      );
      attachJson("Bulk reassign target", {
        strategy: "team",
        group: target.group,
        user: target.user.email,
        query: created.query,
      });
      const names = created.leads.map((owned) => `${owned.lead.firstName} ${owned.lead.lastName}`);

      await loginAs(owner.email, settings.credentials.userPassword);
      const run = await searchAndBulkReassign({
        query: created.query,
        names,
        strategy: "team",
        group: target.group.text,
        user: target.userLabel,
      });

      await step("UI: the search lists only the five leads and all five are selected", async () => {
        const listed = run.listText.toLowerCase();
        expect(listed).toContain(`(${LEAD_COUNT})`);
        for (const name of names) expect(listed).toContain(name.toLowerCase());
        expect(run.selectedText).toBe(`${LEAD_COUNT} selected`);
      });
      await step("UI: Reassign confirms the bulk update started", async () => {
        attachJson("Save outcome", run.outcome);
        expect(run.outcome.errors).toEqual([]);
        expect(run.outcome.formClosed).toBe(true);
        expect(run.outcome.successMessage).toMatch(/Bulk Lead Reassign started in background/i);
      });

      const leads = new LeadsApi();
      await step("API: each lead is owned by the user who was picked", async () => {
        for (const owned of created.leads) {
          const deadline = Date.now() + 90_000;
          let ownerId = "";
          while (Date.now() < deadline) {
            const saved = await leads.retrieve(owned.lead.email);
            ownerId = saved.sales_details?.id ?? "";
            if (ownerId === target.user._id) break;
            await sleep(3_000);
          }
          expect(ownerId).toBe(target.user._id);
        }
      });
      await step("API: each feed records the reassignment", async () => {
        for (const owned of created.leads) {
          const feed = await ownerProfile.feedWhen(owned.leadId, (item) => item.feedType === "reassign", 90_000);
          expect(feed.feedType).toBe("reassign");
          expect(feed.content).toMatch(/reassigned/i);
        }
      });

      await step("API: the previous owner is no longer allowed to edit", async () => {
        for (const owned of created.leads) {
          const access = await ownerProfile.access(owned.leadId);
          expect(access.isMine).toBe(false);
          expect(access.edit).toBe(false);
          expect(access.salesId).toBe(target.user._id);
        }
      });
      await step("UI: the previous owner's search no longer lists these leads", async () => {
        const list = new LeadsListScreen();
        await list.search(created.query);
        const shown = (await list.waitForResultCount(0)).toLowerCase();
        expect(shown).toContain("(0)");
        for (const name of names) expect(shown).not.toContain(name.toLowerCase());
      });

      await new HomeScreen().logout();
      const newToken = await step("API: sign in as the new owner", () =>
        new SessionApi().accessToken(target.user.email, settings.credentials.userPassword),
      );
      const gained = await step("API: the new owner is allowed to edit", () =>
        new LeadProfileApi(newToken).access(created.leads[0].leadId),
      );
      await step("API: isMine and edit are true for the new owner", async () => {
        attachJson("New owner access", gained);
        expect(gained.isMine).toBe(true);
        expect(gained.edit).toBe(true);
        expect(gained.salesId).toBe(target.user._id);
      });

      await loginAs(target.user.email, settings.credentials.userPassword);
      const detail = await step("UI: the new owner finds the lead", async () => {
        const home = new HomeScreen();
        const list = await home.openLeads();
        await list.search(created.query);
        await list.waitForSearchResults(names, names.length);
        return new LeadDetailScreen().openFromList(names[0]);
      });
      await step("UI: the Feed tab records the reassignment", async () => {
        await detail.showFeed();
        const feed = await detail.waitForText("reassigned");
        expect(feed).toContain("reassigned");
      });
      await step("UI: Edit lead opens for the new owner", async () => {
        await (await detail.openMore()).editLead();
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
