import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { FollowupsApi } from "../../../src/api/FollowupsApi.ts";
import { ScheduleSlotApi } from "../../../src/api/ScheduleSlotApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { expectFields } from "../../../src/core/expectFields.ts";
import { normalize } from "../../../src/core/normalize.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { createLeadForSalesUser } from "../../../src/data/LeadSetup.ts";
import { followUpAt, formWhen, utcMinute, utcStamp, visitWhen } from "../../../src/data/schedule.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { findLead } from "../../../src/flows/leads.flow.ts";

/**
 * FU-001 Sales user schedules a follow-up from the lead for tomorrow 2 PM.
 *
 * Preconditions: an active sales user (data provider) and a lead created through
 * POST /api/leads/create and assigned to that user. The follow-up type, timezone
 * and required custom fields come from GET /api/v3/client/leads/:id/followups/new.
 * Under test: global search, Add follow-up (POST /api/v3/client/leads/:id/followups).
 * Read back: GET /client/leads/:id/activities.json?filters[_type]=Followup.
 */
describe("Follow-ups | Schedule", () => {
  it("@regression @follow-ups FU-001 Sales user schedules a follow-up for tomorrow 2 PM", async () => {
    await addFeature("Follow-ups");
    await addStory("Schedule from the lead");
    await addSeverity("critical");
    await addTestId("FU-001");

    const arranged = await step("API: create a lead for an active sales user", () => createLeadForSalesUser());
    const when = followUpAt();
    const stamp = Date.now().toString(36);
    const subject = `Appium follow-up ${stamp}`;
    const agenda = `Call the lead ${stamp}`;
    const token = await step("API: sign in as the sales user", () =>
      new SessionApi().accessToken(arranged.salesUser.email, settings.credentials.userPassword),
    );
    await step("API: mark follow-ups and site visits at tomorrow 2 PM conducted", () =>
      new ScheduleSlotApi(token).markOpenAt({
        leadId: arranged.leadId,
        salesUserId: arranged.salesUser._id,
        kind: "Followup",
        scheduledOn: when,
        endsOn: when,
      }),
    );
    const offered = await step("API: read the type, timezone and required fields the follow-up form offers", () =>
      new FollowupsApi(token).screen(arranged.leadId),
    );

    await loginAs(arranged.salesUser.email, settings.credentials.userPassword);
    const lead = await findLead(arranged.lead.email, `${arranged.lead.firstName} ${arranged.lead.lastName}`);
    const form = await lead.openScheduleFollowUp();
    await form.setWhen(when);
    await form.selectType(offered.type.text);
    await form.enterSubject(subject);
    await form.enterAgenda(agenda);
    for (const field of offered.requiredFields) {
      await form.fillRequired(field.label, field.type, valueFor(field.type));
    }

    await step("UI: the form shows tomorrow 2 PM, the lead timezone and the follow-up type", async () => {
      expect(await form.shownWhen()).toBe(formWhen(when));
      expect(await form.shownTimeZone()).toBe(offered.timeZone);
      expect(normalize.caseInsensitive(await form.shownType())).toBe(normalize.caseInsensitive(offered.type.text));
    });

    const outcome = await form.save();
    await step("UI: Schedule closes the form with no error", async () => {
      attachJson("Schedule outcome", outcome);
      expect(outcome.errors).toEqual([]);
      expect(outcome.formClosed).toBe(true);
    });

    await step("Flow: the Follow-ups tab shows the call scheduled for tomorrow 2 PM", async () => {
      await lead.waitUntilShown();
      await lead.showFollowUps();
      const feed = await lead.waitForText(`A followup ${offered.type.id} is scheduled`);
      expect(feed).toContain(visitWhen(when).toLowerCase());
      expect(feed).toContain("scheduled");
    });
    await step("UI: the follow-up agenda shows the subject and agenda that were entered", async () => {
      const feed = await lead.revealFollowupAgenda(subject, agenda);
      expect(feed).toContain(subject.toLowerCase());
      expect(feed).toContain(agenda.toLowerCase());
    });

    const saved = await step("API: read the follow-up back", () => new FollowupsApi().bySubject(arranged.leadId, subject));
    await step("API: the follow-up is scheduled for tomorrow 2 PM with the entered subject and agenda", async () => {
      const followups = await new FollowupsApi().listForLead(arranged.leadId);
      expect(followups).toHaveLength(1);
      await expectFields("Follow-up", {
        status: { actual: saved.status, expected: "scheduled" },
        type: { actual: saved.followupType, expected: offered.type.id },
        subject: { actual: saved.subject, expected: subject },
        agenda: { actual: saved.agenda, expected: agenda },
        "scheduled at": { actual: saved.scheduledOn, expected: utcStamp(when), normalize: utcMinute },
      });
    });
  });
});

/** A value the required custom control will accept. The label itself comes from the form API. */
function valueFor(type: string): string {
  if (type === "number") return "1";
  if (type === "text" || type === "textarea") return "noted";
  throw new Error(`The follow-up form requires a ${type} field. Fill that control before Schedule.`);
}
