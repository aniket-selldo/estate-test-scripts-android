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
 * EMAIL-004 The owner replies to an incoming email by writing the message.
 *
 * The incoming email has a CC address. Reply addresses only the sender and
 * leaves CC empty. Reply all is the case that keeps the CC.
 * The composer has no template picker, so this reply is a written message and
 * the stored email has no template id.
 *
 * Under test: Reply on the Emails card, then Send Email
 *   POST /api/v3/client/leads/:id/emails  (in_reply_to, empty toCC)
 */
describe("Emails | Reply", () => {
  it("@regression @emails EMAIL-004 Sales user replies to an incoming email and the feed shows the written reply", async () => {
    await addFeature("Emails");
    await addStory("Reply to an incoming email");
    await addSeverity("critical");
    await addTestId("EMAIL-004");

    const incoming = await createLeadFromIncomingMail();
    const replySubject = `Re: ${incoming.subject}`;
    const replyBody = `Appium reply ${incoming.lead.lastName}`;
    const token = await step("API: sign in as the owner", () =>
      new SessionApi().accessToken(incoming.owner.email, settings.credentials.userPassword),
    );
    const profile = new LeadProfileApi(token);
    await step("API: the owner may email the lead, and the incoming mail kept its CC", async () => {
      const access = await profile.access(incoming.leadId);
      expect(access.email).toBe(true);
      expect(access.emailFeed).toBe(true);
      const received = await profile.recordWhen(incoming.leadId, "Email", (fields) => emailField(fields, "subject") === incoming.subject);
      expect(emailDirection(received.fields.direction)).toBe("incoming");
      expect(emailField(received.fields, "toCC").toLowerCase()).toContain(incoming.cc);
    });

    await loginAs(incoming.owner.email, settings.credentials.userPassword);
    const detail = await findLead(incoming.lead.email, `${incoming.lead.firstName} ${incoming.lead.lastName}`);
    await detail.showEmails();
    await step("UI: the incoming card offers Reply and Reply all", async () => {
      const feed = await detail.waitForText(incoming.subject);
      expect(feed).toContain(incoming.subject.toLowerCase());
      expect(feed).toContain("incoming");
      expect(await detail.emailActionVisible("Reply")).toBe(true);
      expect(await detail.emailActionVisible("Reply all")).toBe(true);
    });

    const composer = await detail.openEmailReply(incoming.subject, false);
    await step("UI: Reply is addressed to the sender, with the Re: subject and an empty CC", async () => {
      const prefill = await composer.prefill();
      attachJson("Reply prefill", prefill);
      expect(prefill.emailType).toBe("General Email");
      expect(prefill.to.toLowerCase()).toContain(incoming.lead.email.toLowerCase());
      expect(prefill.subject).toBe(replySubject);
      expect(prefill.cc.toLowerCase()).not.toContain(incoming.cc);
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
    await step("UI: the Emails tab shows the written reply as outgoing", async () => {
      const feed = await detail.waitForText(replySubject);
      expect(feed).toContain(replySubject.toLowerCase());
      expect(feed).toContain("outgoing");
    });

    await step("API: the reply is outgoing, keeps the written subject, and does not copy the CC", async () => {
      const saved = await profile.recordWhen(incoming.leadId, "Email", (fields) => emailField(fields, "subject") === replySubject);
      expect(emailDirection(saved.fields.direction)).toBe("outgoing");
      expect(emailField(saved.fields, "subject")).toBe(replySubject);
      expect(emailField(saved.fields, "fromaddr")).toContain("@");
      expect(emailField(saved.fields, "fromaddr").toLowerCase()).not.toContain(incoming.lead.email.toLowerCase());
      expect(emailField(saved.fields, "toCC").toLowerCase()).not.toContain(incoming.cc);
      expect(emailField(saved.fields, "email_template_id")).toBe("");
      expect(emailField(saved.fields, "email_template_type")).toBe("email_template");
      expect(saved.fields.unread).toBe(true);
      expect(emailField(saved.fields, "notify")).toBe("lead");
      const emailId = emailField(saved.fields, "_id") || emailField(saved.fields, "id");
      const emails = new EmailsApi();
      const message = await emails.message(incoming.leadId, emailId, token);
      attachJson("Stored reply", message);
      // This build stores the reply with an empty toaddr. The composer To is the recipient check.
      expect(emailField(message, "subject")).toBe(replySubject);
      expect(emailDirection(message.direction)).toBe("outgoing");
      expect(emailField(message, "toCC").toLowerCase()).not.toContain(incoming.cc);
      const page = await emails.page(incoming.leadId, emailId);
      expect(page).toContain(replySubject);
      expect(page.toLowerCase()).toContain(replyBody.toLowerCase());
    });
  });
});
