import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { emailDirection } from "../../../src/api/EmailsApi.ts";
import { LeadProfileApi } from "../../../src/api/LeadProfileApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { UserRole, UsersApi } from "../../../src/api/UsersApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { createOwnedLead } from "../../../src/data/LeadSetup.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { findLead } from "../../../src/flows/leads.flow.ts";
import { LeadDetailScreen } from "../../../src/screens/leads/LeadDetail.screen.ts";

/**
 * EMAIL-001 Sales user sends a general email and the Emails feed shows it.
 *
 * Preconditions: an active sales user and a lead assigned to that user, with an email address.
 * Under test: Send email (POST /api/v3/client/leads/:id/emails).
 * The composer opens with Email type "General email" and To set to the lead's primary address.
 * Read back: GET /client/leads/:id/activities.json?filters[_type]=Email.
 * The card title on the Emails tab is the subject (lead_activity_summary.dart).
 */
describe("Emails | Send", () => {
  it("@regression @emails EMAIL-001 Sales user sends an email and the Emails feed shows the subject", async () => {
    await addFeature("Emails");
    await addStory("Send a general email from the lead");
    await addSeverity("critical");
    await addTestId("EMAIL-001");

    const salesUser = await step("API: get an active sales user", () => new UsersApi().firstActiveUser(UserRole.Sales));
    const owned = await step("API: create a lead assigned to that user", () => createOwnedLead(salesUser));
    const token = await step("API: sign in as the sales user", () =>
      new SessionApi().accessToken(salesUser.email, settings.credentials.userPassword),
    );
    const profile = new LeadProfileApi(token);
    await step("API: the owner is allowed to email the lead", async () => {
      const access = await profile.access(owned.leadId);
      expect(access.email).toBe(true);
      expect(access.emailFeed).toBe(true);
    });
    const subject = `Appium email ${owned.lead.lastName}`;
    const body = `Appium email body ${owned.lead.lastName}`;

    await loginAs(salesUser.email, settings.credentials.userPassword);
    const detail = await findLead(owned.lead.email, `${owned.lead.firstName} ${owned.lead.lastName}`);
    const form = await (await detail.openMore()).sendEmail();
    await step("UI: the composer is a general email addressed to the lead", async () => {
      expect(await form.shownType()).toBe("General email");
      expect((await form.shownTo()).toLowerCase()).toContain(owned.lead.email.toLowerCase());
    });
    await form.enterMessage(subject, body);
    const outcome = await form.save();

    await step("UI: Send email closes and confirms the email was sent", async () => {
      attachJson("Save outcome", outcome);
      expect(outcome.errors).toEqual([]);
      expect(outcome.formClosed).toBe(true);
      expect(outcome.successMessage).toMatch(/Email sent successfully/i);
    });

    await step("UI: the Emails tab shows the subject", async () => {
      const screen = await new LeadDetailScreen().waitUntilShown();
      await screen.showEmails();
      const feed = await screen.waitForText(subject);
      expect(feed).toContain(subject.toLowerCase());
      expect(feed).toContain("outgoing");
    });

    await step("API: the email activity is an unread outgoing general email with that subject", async () => {
      const saved = await profile.recordWhen(owned.leadId, "Email", (fields) => String(fields.subject ?? "") === subject);
      expect(String(saved.fields.subject ?? "")).toBe(subject);
      expect(emailDirection(saved.fields.direction)).toBe("outgoing");
      expect(String(saved.fields.email_template_type ?? "")).toBe("email_template");
      expect(saved.fields.unread).toBe(true);
    });
  });
});
