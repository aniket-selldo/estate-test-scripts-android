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
 * SV-002 A site visit scheduled through the API is marked not interested in the app.
 * "Not interested" is stored as status `dropped` (site_visit_action.dart).
 * Schedule: POST /api/v3/client/leads/:id/site_visits. Status: PATCH /api/v3/client/site_visits/:id/status.
 */
describe("Site visits | Not interested", () => {
  it("@regression @site-visits SV-002 Sales user marks an API-scheduled site visit as not interested", async () => {
    await addFeature("Site visits");
    await addStory("Mark an API-scheduled visit not interested");
    await addSeverity("critical");
    await addTestId("SV-002");

    const arranged = await step("API: create a lead for an active sales user", () => createLeadForSalesUser());
    const starts = siteVisitAt();
    const ends = followUpAt();
    const agenda = `appium not interested ${Date.now().toString(36)}`;
    const token = await step("API: sign in as the sales user", () =>
      new SessionApi().accessToken(arranged.salesUser.email, settings.credentials.userPassword),
    );
    const visits = new SiteVisitsApi(token);
    await step("API: mark follow-ups and site visits from tomorrow 1 PM to 2 PM conducted", () =>
      new ScheduleSlotApi(token).markOpenAt({
        leadId: arranged.leadId,
        salesUserId: arranged.salesUser._id,
        kind: "SiteVisit",
        projectId: arranged.project.id,
        scheduledOn: starts,
        endsOn: ends,
      }),
    );
    await step("API: schedule a site visit for tomorrow 1 PM", () =>
      visits.schedule(arranged.leadId, {
        projectId: arranged.project.id,
        typeId: arranged.siteVisitType.id,
        scheduledOn: utcStamp(starts),
        endsOn: utcStamp(ends),
        campaignId: arranged.campaign.id,
        agenda,
      }),
    );

    await loginAs(arranged.salesUser.email, settings.credentials.userPassword);
    const lead = await findLead(arranged.lead.phone, `${arranged.lead.firstName} ${arranged.lead.lastName}`);
    await lead.showSiteVisits();
    await step("UI: the feed shows the visit scheduled for tomorrow 1 PM", async () => {
      const feed = await lead.waitForText("The visit is scheduled");
      expect(feed).toContain(visitWhen(starts).toLowerCase());
      expect(feed).toContain("scheduled");
    });
    await step("UI: the site visit campaign matches the lead campaign", async () => {
      const feed = await lead.revealVisitCampaign(arranged.campaign.text);
      expect(feed).toContain(arranged.campaign.text.toLowerCase());
    });

    const form = await lead.chooseVisitAction("Mark not interested", LeadDetailLocators.notInterestedForm);
    const outcome = await form.markNotInterested();
    await step("UI: Mark not interested closes and confirms the update", async () => {
      attachJson("Not interested outcome", outcome);
      expect(outcome.errors).toEqual([]);
      expect(outcome.formClosed).toBe(true);
    });

    const saved = await step("API: read the site visit back", () => visits.byAgenda(arranged.leadId, agenda));
    await step("API: the visit is dropped and keeps its project, time and campaign", async () =>
      expectFields("Site visit", {
        status: { actual: saved.status, expected: "dropped" },
        project: { actual: saved.projectId, expected: arranged.project.id },
        "campaign id": { actual: saved.campaignId, expected: arranged.campaign.id },
        "campaign name": { actual: saved.campaignName, expected: arranged.campaign.text, normalize: normalize.caseInsensitive },
        "scheduled at": { actual: saved.scheduledOn, expected: utcStamp(starts), normalize: utcMinute },
      }),
    );
    await step("UI: the conversation feed shows the visit as not interested", async () => {
      const feed = await lead.waitForText("no longer interested");
      expect(feed).toContain("dropped");
    });
  });
});
