import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { ClientConfigApi } from "../../../src/api/ClientConfigApi.ts";
import { EmailsApi, emailDirection } from "../../../src/api/EmailsApi.ts";
import { LeadsApi } from "../../../src/api/LeadsApi.ts";
import { LeadProfileApi } from "../../../src/api/LeadProfileApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { UsersApi } from "../../../src/api/UsersApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { expectFields } from "../../../src/core/expectFields.ts";
import { normalize } from "../../../src/core/normalize.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { ClientConfigData } from "../../../src/data/ClientConfigData.ts";
import { LeadFactory } from "../../../src/data/LeadFactory.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { findLead } from "../../../src/flows/leads.flow.ts";
import { LeadDetailScreen } from "../../../src/screens/leads/LeadDetail.screen.ts";

/**
 * EMAIL-002 An email sent to a campaign mailbox creates a lead, and the Emails feed shows it.
 *
 * Preconditions: a campaign email address from the medium-value data provider
 *   GET /client/campaigns/data_provider_medium_values.json
 *   The same list the app uses for campaign mediums. Plus-aliases are skipped.
 *   The address is the required `recipient`, the way a campaign id is required on Add lead.
 *
 * Under test (API, the Mailgun webhook):
 *   POST /client/:client_id/mails/mailgun/incoming_mail
 *   Client::Mails::MailgunController#incoming_mail
 *   IncomingMailLogObserver creates the lead when attachment-count is sent.
 *
 * Read back:
 *   GET /api/leads/email/retrieve_lead
 *   GET /client/leads/:id/activities.json?filters[_type]=Email
 * The activity list keeps subject, direction and fromaddr. It leaves toaddr empty
 * and does not include the HTML body. The owner the rule assigns opens the lead.
 * The Emails tab title is the subject.
 */
describe("Emails | Incoming", () => {
  it("@regression @emails EMAIL-002 An email to a campaign mailbox creates a lead and the Emails feed shows it", async () => {
    await addFeature("Emails");
    await addStory("Create a lead from an incoming email");
    await addSeverity("critical");
    await addTestId("EMAIL-002");

    const mailbox = await step("API: pick a campaign email address", () => ClientConfigData.campaignMailbox());
    const lead = LeadFactory.build();
    const subject = `Appium incoming ${lead.lastName}`;
    const body = `Appium incoming body ${lead.lastName}`;
    await step("API: deliver the email to that campaign mailbox", () =>
      new EmailsApi().receive({
        recipient: mailbox.text,
        fromEmail: lead.email,
        fromName: `${lead.firstName} ${lead.lastName}`,
        subject,
        body,
      }),
    );

    const saved = await step("API: retrieve the lead created from the sender", () =>
      new LeadsApi().retrieveWhenExists(lead.email),
    );
    const leadId = saved.lead?.id ?? "";
    const campaignId = (saved.lead?.last_campaign as { id?: string } | undefined)?.id ?? "";
    const ownerId = saved.sales_details?.id ?? "";
    await step("API: the lead stores the sender name and a campaign from routing", async () => {
      const campaigns = await new ClientConfigApi().campaigns();
      expect(campaigns.some((campaign) => campaign.id === campaignId)).toBe(true);
      expectFields("Incoming lead", {
        "first name": { actual: saved.lead?.first_name, expected: lead.firstName },
        "last name": { actual: saved.lead?.last_name, expected: lead.lastName },
        email: { actual: saved.lead?.email, expected: lead.email, normalize: normalize.caseInsensitive },
      });
      expect(ownerId).not.toBe("");
    });

    const owner = await step("API: get the user the email was routed to", () => new UsersApi().userById(ownerId));
    const token = await step("API: sign in as that user", () =>
      new SessionApi().accessToken(owner.email, settings.credentials.userPassword),
    );
    const profile = new LeadProfileApi(token);
    await step("API: the email activity is incoming and keeps the subject and sender", async () => {
      const email = await profile.recordWhen(leadId, "Email", (fields) => String(fields.subject ?? "") === subject);
      expect(emailDirection(email.fields.direction)).toBe("incoming");
      expect(String(email.fields.subject ?? "")).toBe(subject);
      expect(String(email.fields.fromaddr ?? "").toLowerCase()).toBe(lead.email.toLowerCase());
      expect(String(email.fields.fromname ?? "")).toContain(lead.firstName);
      expect(String(email.fields.fromname ?? "")).toContain(lead.lastName);
      expect(email.fields.unread).toBe(true);
    });

    await loginAs(owner.email, settings.credentials.userPassword);
    await findLead(lead.email, `${lead.firstName} ${lead.lastName}`);
    await step("UI: the Emails tab shows the received subject", async () => {
      const screen = await new LeadDetailScreen().waitUntilShown();
      await screen.showEmails();
      const feed = await screen.waitForText(subject);
      expect(feed).toContain(subject.toLowerCase());
      expect(feed).toContain("incoming");
    });
  });
});
