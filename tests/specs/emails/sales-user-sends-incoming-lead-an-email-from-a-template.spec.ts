import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { emailDirection, emailField, EmailsApi } from "../../../src/api/EmailsApi.ts";
import { LeadProfileApi } from "../../../src/api/LeadProfileApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { createLeadFromIncomingMail } from "../../../src/data/IncomingMail.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { findLead } from "../../../src/flows/leads.flow.ts";

/**
 * EMAIL-006 The owner sends the incoming lead an email from an existing template.
 *
 * Reply and Reply all have no template field. Send email is the composer that
 * loads `email_templates` and posts `email_template_id`. The server then stores
 * that template's subject and body.
 *
 * Under test: Send email, Template, Send email
 *   GET  /api/v3/client/leads/:id/activity_lookups?type=email_template
 *   POST /api/v3/client/leads/:id/emails
 */
describe("Emails | Template", () => {
  it("@regression @emails EMAIL-006 Sales user sends the incoming lead an email from an existing template", async () => {
    await addFeature("Emails");
    await addStory("Send an existing email template to the incoming lead");
    await addSeverity("critical");
    await addTestId("EMAIL-006");

    const incoming = await createLeadFromIncomingMail();
    const token = await step("API: sign in as the owner", () =>
      new SessionApi().accessToken(incoming.owner.email, settings.credentials.userPassword),
    );
    const profile = new LeadProfileApi(token);
    const template = await step("API: pick an email template with a plain subject and sentence", () =>
      new EmailsApi().usableTemplate(incoming.leadId, token),
    );
    attachJson("Email template", template);

    await loginAs(incoming.owner.email, settings.credentials.userPassword);
    const detail = await findLead(incoming.lead.email, `${incoming.lead.firstName} ${incoming.lead.lastName}`);
    await detail.showEmails();
    await step("UI: the Emails tab still shows the incoming message", async () => {
      const feed = await detail.waitForText(incoming.subject);
      expect(feed).toContain(incoming.subject.toLowerCase());
      expect(feed).toContain("incoming");
    });

    const form = await (await detail.openMore()).sendEmail();
    await step("UI: the composer is a general email addressed to the lead", async () => {
      expect(await form.shownType()).toBe("General email");
      expect((await form.shownTo()).toLowerCase()).toContain(incoming.lead.email.toLowerCase());
    });
    await form.selectTemplate(template.name);
    await step("UI: the template fills its own subject", async () => {
      expect((await form.shownTemplate()).toLowerCase()).toContain(template.name.toLowerCase());
      expect(await form.shownSubject()).toBe(template.subject);
    });
    const outcome = await form.save();

    await step("UI: Send email closes and confirms the email was sent", async () => {
      attachJson("Save outcome", outcome);
      expect(outcome.errors).toEqual([]);
      expect(outcome.formClosed).toBe(true);
      expect(outcome.successMessage).toMatch(/Email sent successfully/i);
    });

    await detail.showEmails();
    await step("UI: the Emails tab shows the template subject as outgoing", async () => {
      const feed = await detail.waitForText(template.subject);
      expect(feed).toContain(template.subject.toLowerCase());
      expect(feed).toContain("outgoing");
    });

    await step("API: the sent email stores that template, its subject, and its sentence", async () => {
      const saved = await profile.recordWhen(incoming.leadId, "Email", (fields) => emailField(fields, "email_template_id") === template.id);
      expect(emailDirection(saved.fields.direction)).toBe("outgoing");
      expect(emailField(saved.fields, "subject")).toBe(template.subject);
      expect(emailField(saved.fields, "email_template_type")).toBe("email_template");
      expect(emailField(saved.fields, "fromaddr")).toContain("@");
      const emailId = emailField(saved.fields, "_id") || emailField(saved.fields, "id");
      const emails = new EmailsApi();
      const message = await emails.message(incoming.leadId, emailId, token);
      attachJson("Stored template email", message);
      expect(emailField(message, "subject")).toBe(template.subject);
      expect(emailDirection(message.direction)).toBe("outgoing");
      const page = await emails.page(incoming.leadId, emailId);
      expect(page).toContain(template.subject);
      expect(page.toLowerCase()).toContain(template.phrase.toLowerCase());
    });
    await step("API: the incoming email is still on the lead", async () => {
      const received = await profile.recordWhen(incoming.leadId, "Email", (fields) => emailField(fields, "subject") === incoming.subject);
      expect(emailDirection(received.fields.direction)).toBe("incoming");
    });
  });
});
