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
 * EMAIL-005 The owner uses Reply all on an incoming email and writes the message.
 *
 * Reply all keeps the incoming CC. Reply is the case that drops it.
 * The body is written in the composer. The stored email has no template id.
 *
 * Under test: Reply all on the Emails card, then Send Email
 *   POST /api/v3/client/leads/:id/emails  (in_reply_to, toCC)
 */
describe("Emails | Reply all", () => {
  it("@regression @emails EMAIL-005 Sales user replies to all on an incoming email and the reply keeps the CC", async () => {
    await addFeature("Emails");
    await addStory("Reply all to an incoming email");
    await addSeverity("critical");
    await addTestId("EMAIL-005");

    const incoming = await createLeadFromIncomingMail();
    const replySubject = `Re: ${incoming.subject}`;
    const replyBody = `Appium reply all ${incoming.lead.lastName}`;
    const token = await step("API: sign in as the owner", () =>
      new SessionApi().accessToken(incoming.owner.email, settings.credentials.userPassword),
    );
    const profile = new LeadProfileApi(token);
    await step("API: the incoming mail stored the CC address", async () => {
      const received = await profile.recordWhen(incoming.leadId, "Email", (fields) => emailField(fields, "subject") === incoming.subject);
      expect(emailDirection(received.fields.direction)).toBe("incoming");
      expect(emailField(received.fields, "fromaddr").toLowerCase()).toBe(incoming.lead.email.toLowerCase());
      expect(emailField(received.fields, "toCC").toLowerCase()).toContain(incoming.cc);
    });

    await loginAs(incoming.owner.email, settings.credentials.userPassword);
    const detail = await findLead(incoming.lead.email, `${incoming.lead.firstName} ${incoming.lead.lastName}`);
    await detail.showEmails();
    const composer = await detail.openEmailReply(incoming.subject, true);
    await step("UI: Reply all keeps the CC and still addresses the sender", async () => {
      const prefill = await composer.prefill();
      attachJson("Reply all prefill", prefill);
      expect(prefill.emailType).toBe("General Email");
      expect(prefill.to.toLowerCase()).toContain(incoming.lead.email.toLowerCase());
      expect(prefill.subject).toBe(replySubject);
      expect(prefill.cc.toLowerCase()).toContain(incoming.cc);
      expect(prefill.bcc.toLowerCase()).not.toContain("@");
    });
    await composer.enterBody(replyBody);
    const outcome = await composer.save();

    await step("UI: Send Email closes", async () => {
      attachJson("Save outcome", outcome);
      expect(outcome.errors).toEqual([]);
      expect(outcome.formClosed).toBe(true);
    });

    await detail.showEmails();
    await step("UI: the Emails tab shows the reply-all message as outgoing", async () => {
      const feed = await detail.waitForText(replySubject);
      expect(feed).toContain(replySubject.toLowerCase());
      expect(feed).toContain("outgoing");
    });

    await step("API: the reply is outgoing, addressed to the sender, and still copies the CC", async () => {
      const saved = await profile.recordWhen(incoming.leadId, "Email", (fields) => emailField(fields, "subject") === replySubject);
      expect(emailDirection(saved.fields.direction)).toBe("outgoing");
      expect(emailField(saved.fields, "subject")).toBe(replySubject);
      expect(emailField(saved.fields, "fromaddr")).toContain("@");
      expect(emailField(saved.fields, "fromaddr").toLowerCase()).not.toContain(incoming.lead.email.toLowerCase());
      expect(emailField(saved.fields, "toCC").toLowerCase()).toContain(incoming.cc);
      expect(emailField(saved.fields, "email_template_id")).toBe("");
      expect(saved.fields.unread).toBe(true);
      expect(emailField(saved.fields, "notify")).toBe("lead");
      const emailId = emailField(saved.fields, "_id") || emailField(saved.fields, "id");
      const emails = new EmailsApi();
      const message = await emails.message(incoming.leadId, emailId, token);
      attachJson("Stored reply", message);
      expect(emailField(message, "subject")).toBe(replySubject);
      expect(emailDirection(message.direction)).toBe("outgoing");
      expect(emailField(message, "toCC").toLowerCase()).toContain(incoming.cc);
      const page = await emails.page(incoming.leadId, emailId);
      expect(page).toContain(replySubject);
      expect(page.toLowerCase()).toContain(replyBody.toLowerCase());
    });
    await step("API: the original incoming email is still on the lead", async () => {
      const received = await profile.recordWhen(incoming.leadId, "Email", (fields) => emailField(fields, "subject") === incoming.subject);
      expect(emailDirection(received.fields.direction)).toBe("incoming");
    });
  });
});
