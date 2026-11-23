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
 * FU-003 Sales user cancels a scheduled follow-up.
 *
 * Preconditions: a lead for an active sales user, a follow-up scheduled through
 * POST /api/v3/client/leads/:id/followups, and a cancellation reason from
 * GET /api/v3/client/leads/:id/followups/new (`options.cancellation_reasons`).
 * Under test: Cancel follow-up. Cancellation reason and Note are both required
 * (FollowupCancelDraft.validate). The test fills both, then
 * PATCH /api/v3/client/followups/:id/status with status `cancelled` and the reason,
 * then PATCH /api/v3/client/followups/:id with the note.
 * "Schedule followup" stays unchecked, so no replacement is created.
 * Read back: GET /client/leads/:id/activities.json?filters[_type]=Followup.
 *
 * The cancel screen loads its reason list from GET /api/v3/workflows/lookups?type=followup_cancellation_reasons
 * (followup_cancel_screen.dart). For this sales user that lookup returns 403 Forbidden.
 * The assertion that a reason can be chosen stays.
 */
describe("Follow-ups | Cancel", () => {
  it("@regression @follow-ups FU-003 Sales user cancels a scheduled follow-up", async () => {
    await addFeature("Follow-ups");
    await addStory("Cancel a scheduled follow-up");
    await addSeverity("critical");
    await addTestId("FU-003");

    const arranged = await step("API: create a lead for an active sales user", () => createLeadForSalesUser());
    const when = followUpAt();
    const stamp = Date.now().toString(36);
    const subject = `Appium follow-up ${stamp}`;
    const agenda = `Call the lead ${stamp}`;
    const note = `Cancelled from the app ${stamp}`;
    const scheduled = await step("API: schedule a follow-up for tomorrow 2 PM and read a cancellation reason", async () => {
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
      const reason = form.cancellationReasons[0];
      if (!reason) throw new Error("Follow-up form returned no cancellation reason");
      const id = await api.schedule(arranged.leadId, {
        typeId: form.type.id,
        scheduledOn: utcStamp(when),
        subject,
        agenda,
      });
      return { id, typeId: form.type.id, reason };
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

    const cancel = await lead.openCancelFollowUp();
    await cancel.enterNote(note);
    await cancel.selectReason(scheduled.reason.text);
    await step("UI: the required cancellation reason and note are filled", async () => {
      expect(await cancel.shownReason()).toBe(scheduled.reason.text);
      expect(await cancel.shownNote()).toBe(note);
    });
    const outcome = await cancel.confirm();
    await step("UI: Cancel follow-up closes the form with no error", async () => {
      attachJson("Cancel outcome", outcome);
      expect(outcome.errors).toEqual([]);
      expect(outcome.formClosed).toBe(true);
    });

    await step("UI: the conversation feed shows the follow-up as cancelled, with the reason", async () => {
      await lead.waitUntilShown();
      await lead.showFollowUps();
      const feed = await lead.waitForText("was cancelled");
      expect(feed).toContain(visitWhen(when).toLowerCase());
      expect(feed).toContain("cancelled");
      expect(feed).toContain(scheduled.reason.text.toLowerCase());
    });

    const saved = await step("API: read the follow-up back", () => new FollowupsApi().bySubject(arranged.leadId, subject));
    await step("API: the follow-up is cancelled with the reason and note, and no replacement was scheduled", async () => {
      const followups = await new FollowupsApi().listForLead(arranged.leadId);
      expect(followups).toHaveLength(1);
      await expectFields("Follow-up", {
        status: { actual: saved.status, expected: "cancelled" },
        type: { actual: saved.followupType, expected: scheduled.typeId },
        subject: { actual: saved.subject, expected: subject },
        agenda: { actual: saved.agenda, expected: agenda },
        "scheduled at": { actual: saved.scheduledOn, expected: utcStamp(when), normalize: utcMinute },
        "cancellation reason": { actual: saved.cancellationReason, expected: scheduled.reason.text },
        "cancellation note": { actual: saved.cancellationNote, expected: note },
      });
    });
  });
});
