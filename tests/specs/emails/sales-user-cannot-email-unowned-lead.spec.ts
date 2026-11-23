import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { LeadProfileApi, type LeadAccess } from "../../../src/api/LeadProfileApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { UserRole, UsersApi, type SellDoUser } from "../../../src/api/UsersApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { createOwnedLead } from "../../../src/data/LeadSetup.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { findLead } from "../../../src/flows/leads.flow.ts";
import { LeadDetailScreen } from "../../../src/screens/leads/LeadDetail.screen.ts";

/**
 * EMAIL-003 A sales user who does not own the lead cannot send email, and can still open the Emails feed.
 *
 * Preconditions: a lead owned by one sales user, and another sales user for whom
 *   GET /api/v3/client/leads/:id returns isMine false and actions.email false.
 *   actions.email is `mine && email && email_on` (V3::Leads::Actions).
 *   actions.email_feed stays true while email is enabled, so the Emails tab remains.
 *
 * Under test: More actions hides Email (lead_more_actions.dart). When the sheet has no rows,
 * the app shows "You are not allowed to perform this action" instead.
 * The Emails tab empty state is "No emails yet."
 */
describe("Emails | Access", () => {
  it("@regression @emails EMAIL-003 A sales user who does not own the lead cannot send email and can open the Emails feed", async () => {
    await addFeature("Emails");
    await addStory("Email access on a lead owned by someone else");
    await addSeverity("critical");
    await addTestId("EMAIL-003");

    const owner = await step("API: get an active sales user", () => new UsersApi().firstActiveUser(UserRole.Sales));
    const owned = await step("API: create a lead assigned to that user", () => createOwnedLead(owner));
    const outsider = await step("API: find a sales user who is not allowed to email that lead", () =>
      salesUserWhoCannotEmail(owned.leadId, owner._id),
    );
    attachJson("Outsider access", { user: outsider.user.email, ...outsider.access });
    await step("API: email is denied and the Emails feed stays available", async () => {
      expect(outsider.access.isMine).toBe(false);
      expect(outsider.access.email).toBe(false);
      expect(outsider.access.emailFeed).toBe(true);
    });

    await loginAs(outsider.user.email, settings.credentials.userPassword);
    const detail = await findLead(owned.lead.email, `${owned.lead.firstName} ${owned.lead.lastName}`);
    await step("UI: the lead shows the access message returned by the API", async () => {
      const shown = await detail.shownText();
      const lines = outsider.access.messages.flatMap((message) => message.split("\n")).map((line) => line.trim()).filter(Boolean);
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) expect(shown).toContain(line);
    });
    await step("UI: Email is not offered", async () => {
      expect(await detail.emailActionOffered()).toBe(false);
    });
    await step("UI: the Emails feed opens and has no emails yet", async () => {
      const screen = await new LeadDetailScreen().waitUntilShown();
      await screen.showEmails();
      const feed = await screen.waitForText("No emails yet");
      expect(feed).toContain("no emails yet");
    });
  });
});

/** First other sales user whose lead detail says they do not own it and cannot email it. */
async function salesUserWhoCannotEmail(leadId: string, ownerId: string): Promise<{ user: SellDoUser; access: LeadAccess }> {
  const candidates = (await new UsersApi().listAllActiveUsers(UserRole.Sales)).filter((user) => user._id !== ownerId);
  for (const user of candidates) {
    const token = await new SessionApi().accessToken(user.email, settings.credentials.userPassword);
    const access = await new LeadProfileApi(token).access(leadId);
    if (!access.isMine && !access.email) return { user, access };
  }
  throw new Error(`Every other sales user can still email lead ${leadId}`);
}
