import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { FollowupsApi } from "../../../src/api/FollowupsApi.ts";
import { ScheduleSlotApi } from "../../../src/api/ScheduleSlotApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { expectFields } from "../../../src/core/expectFields.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { createLeadForSalesUser } from "../../../src/data/LeadSetup.ts";
import { followUpAt, utcMinute, utcStamp, visitWhen } from "../../../src/data/schedule.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { findLead } from "../../../src/flows/leads.flow.ts";

/**
 * FU-002 Sales user marks a scheduled follow-up conducted.
 *
 * Preconditions: a lead for an active sales user, and a follow-up scheduled through
 * POST /api/v3/client/leads/:id/followups for tomorrow 2 PM.
 * Open follow-ups and site visits at that time are marked conducted first.
 * Under test: Mark as conducted on the Overview follow-up card
 * (PATCH /api/v3/client/followups/:id/status, status `conducted`).
 * That card always shows the button. The Follow-ups feed only shows it when
 * the client allows direct conduct.
 * Read back: GET /client/leads/:id/activities.json?filters[_type]=Followup.
 */
describe("Follow-ups | Conduct", () => {
  it("@regression @follow-ups FU-002 Sales user marks a scheduled follow-up conducted", async () => {
    await addFeature("Follow-ups");
    await addStory("Mark a scheduled follow-up conducted");
    await addSeverity("critical");
    await addTestId("FU-002");

    const arranged = await step("API: create a lead for an active sales user", () => createLeadForSalesUser());
    const when = followUpAt();
    const stamp = Date.now().toString(36);
    const subject = `Appium follow-up ${stamp}`;
    const agenda = `Call the lead ${stamp}`;
    const scheduled = await step("API: schedule a follow-up for tomorrow 2 PM", async () => {
      const token = await new SessionApi().accessToken(arranged.salesUser.email, settings.credentials.userPassword);
      await new ScheduleSlotApi(token).markOpenAt({
        leadId: arranged.leadId,
        salesUserId: arranged.salesUser._id,
        kind: "Followup",
        scheduledOn: when,
        endsOn: when,
      });
      const api = new FollowupsApi(token);
      const form = await api.screen(arranged.leadId);
      const id = await api.schedule(arranged.leadId, {
        typeId: form.type.id,
        scheduledOn: utcStamp(when),
        subject,
        agenda,
      });
      return { id, typeId: form.type.id };
    });
    attachJson("Scheduled follow-up", scheduled);

    await loginAs(arranged.salesUser.email, settings.credentials.userPassword);
    const lead = await findLead(arranged.lead.email, `${arranged.lead.firstName} ${arranged.lead.lastName}`);
    await step("Flow: the Follow-ups tab shows the call scheduled for tomorrow 2 PM", async () => {
      await lead.showFollowUps();
      const feed = await lead.waitForText(`A followup ${scheduled.typeId} is scheduled`);
      expect(feed).toContain(visitWhen(when).toLowerCase());
      expect(feed).toContain("scheduled");
    });
    await step("UI: the follow-up agenda shows the subject and agenda from the API", async () => {
      const feed = await lead.revealFollowupAgenda(subject, agenda);
      expect(feed).toContain(subject.toLowerCase());
      expect(feed).toContain(agenda.toLowerCase());
    });

    await lead.showOverview();
    await lead.markFollowupConducted();
    await lead.showFollowUps();
    await step("UI: the conversation feed shows the follow-up as conducted", async () => {
      // The success snackbar is "Followup marked as conducted." Wait for the activity sentence.
      const feed = await lead.waitForText(`a followup ${scheduled.typeId} was conducted`);
      expect(feed).toContain("conducted");
    });

    const saved = await step("API: read the follow-up back", () => new FollowupsApi().bySubject(arranged.leadId, subject));
    await step("API: the follow-up is conducted and still scheduled for tomorrow 2 PM", async () => {
      const followups = await new FollowupsApi().listForLead(arranged.leadId);
      expect(followups).toHaveLength(1);
      await expectFields("Follow-up", {
        status: { actual: saved.status, expected: "conducted" },
        type: { actual: saved.followupType, expected: scheduled.typeId },
        subject: { actual: saved.subject, expected: subject },
        agenda: { actual: saved.agenda, expected: agenda },
        "scheduled at": { actual: saved.scheduledOn, expected: utcStamp(when), normalize: utcMinute },
      });
    });
  });
});
