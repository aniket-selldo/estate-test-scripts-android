import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { ScheduleSlotApi } from "../../../src/api/ScheduleSlotApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { SiteVisitsApi } from "../../../src/api/SiteVisitsApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { expectFields } from "../../../src/core/expectFields.ts";
import { normalize } from "../../../src/core/normalize.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { createLeadForSalesUser } from "../../../src/data/LeadSetup.ts";
import { followUpAt, siteVisitAt, utcMinute, utcStamp, visitWhen } from "../../../src/data/schedule.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { findLead } from "../../../src/flows/leads.flow.ts";
import { LeadDetailLocators } from "../../../src/screens/leads/LeadDetail.locators.ts";

/**
 * SV-003 A site visit scheduled through the API is moved to 2 PM in the app.
 * Reschedule keeps the status `scheduled` and replaces scheduled_on
 * (PATCH /api/v3/client/site_visits/:id, SiteVisitUpdateKind.reschedule).
 *
 * The app first calls GET /api/v3/client/activities/scheduled_events
 * (site_visit_update_screen.dart). That route is missing on v3 and returns
 * 404 "Template not found", so Reschedule does not close. The assertion stays.
 */
describe("Site visits | Reschedule", () => {
  it("@regression @site-visits SV-003 Sales user reschedules an API-scheduled site visit to tomorrow 2 PM", async () => {
    await addFeature("Site visits");
    await addStory("Reschedule an API-scheduled visit");
    await addSeverity("critical");
    await addTestId("SV-003");

    const arranged = await step("API: create a lead for an active sales user", () => createLeadForSalesUser());
    const original = siteVisitAt();
    const moved = followUpAt();
    const agenda = `appium reschedule ${Date.now().toString(36)}`;
    const token = await step("API: sign in as the sales user", () =>
      new SessionApi().accessToken(arranged.salesUser.email, settings.credentials.userPassword),
    );
    const visits = new SiteVisitsApi(token);
    const slot = new ScheduleSlotApi(token);
    await step("API: mark follow-ups and site visits from tomorrow 1 PM to 2 PM conducted", () =>
      slot.markOpenAt({
        leadId: arranged.leadId,
        salesUserId: arranged.salesUser._id,
        kind: "SiteVisit",
        projectId: arranged.project.id,
        scheduledOn: original,
        endsOn: moved,
      }),
    );
    await step("API: schedule a site visit for tomorrow 1 PM", () =>
      visits.schedule(arranged.leadId, {
        projectId: arranged.project.id,
        typeId: arranged.siteVisitType.id,
        scheduledOn: utcStamp(original),
        endsOn: utcStamp(moved),
        campaignId: arranged.campaign.id,
        agenda,
      }),
    );

    await loginAs(arranged.salesUser.email, settings.credentials.userPassword);
    const lead = await findLead(arranged.lead.email, `${arranged.lead.firstName} ${arranged.lead.lastName}`);
    await lead.showSiteVisits();
    await step("UI: the feed shows the visit scheduled for tomorrow 1 PM", async () => {
      const feed = await lead.waitForText("The visit is scheduled");
      expect(feed).toContain(visitWhen(original).toLowerCase());
      expect(feed).toContain("scheduled");
    });
    await step("UI: the site visit campaign matches the lead campaign", async () => {
      const feed = await lead.revealVisitCampaign(arranged.campaign.text);
      expect(feed).toContain(arranged.campaign.text.toLowerCase());
    });
    const savedBeforeMove = await step("API: read the site visit before it is moved", () => visits.byAgenda(arranged.leadId, agenda));
    await step("API: mark follow-ups and site visits at tomorrow 2 PM conducted", () =>
      slot.markOpenAt({
        leadId: arranged.leadId,
        salesUserId: arranged.salesUser._id,
        kind: "SiteVisit",
        projectId: arranged.project.id,
        scheduledOn: moved,
        endsOn: moved,
        exceptActivityId: savedBeforeMove.id,
      }),
    );
    const form = await lead.chooseVisitAction("Reschedule", LeadDetailLocators.rescheduleForm);
    const outcome = await form.reschedule(moved);
    await step("UI: Reschedule closes and confirms the new time", async () => {
      attachJson("Reschedule outcome", outcome);
      expect(outcome.errors).toEqual([]);
      expect(outcome.formClosed).toBe(true);
    });

    const saved = await step("API: read the site visit back", () => visits.byAgenda(arranged.leadId, agenda));
    await step("API: the visit stays scheduled, now at 2 PM, with the same campaign", async () =>
      expectFields("Site visit", {
        status: { actual: saved.status, expected: "scheduled" },
        project: { actual: saved.projectId, expected: arranged.project.id },
        "campaign id": { actual: saved.campaignId, expected: arranged.campaign.id },
        "campaign name": { actual: saved.campaignName, expected: arranged.campaign.text, normalize: normalize.caseInsensitive },
        "scheduled at": { actual: saved.scheduledOn, expected: utcStamp(moved), normalize: utcMinute },
      }),
    );
    await step("UI: the conversation feed shows the visit still scheduled, now at 2 PM", async () => {
      const feed = await lead.waitForText(visitWhen(moved));
      expect(feed).toContain("the visit is scheduled");
      expect(feed).toContain("scheduled");
    });
  });
});
