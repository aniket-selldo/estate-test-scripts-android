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
 * SV-001 Sales user schedules a site visit from the lead and marks it conducted.
 *
 * Preconditions: an active sales user, a campaign, a project and a site visit type (data providers),
 * and a lead created through POST /api/leads/create and assigned to that user.
 * Under test: global search, Add site visit (POST /api/v3/client/leads/:id/site_visits),
 * Mark as conducted (PATCH /api/v3/client/site_visits/:id/status).
 * Read back: GET /client/leads/:id/activities.json?filters[_type]=SiteVisit.
 *
 * Before create, the app calls GET /api/v3/client/activities/scheduled_events
 * (site_visit_create_screen.dart). That route is missing on v3 and returns
 * 404 "Template not found", so Schedule does not close. The assertion stays.
 */
describe("Site visits | Schedule and conduct", () => {
  it("@regression @site-visits SV-001 Sales user schedules a site visit for tomorrow 1 PM and marks it conducted", async () => {
    await addFeature("Site visits");
    await addStory("Schedule from the lead, then mark conducted");
    await addSeverity("critical");
    await addTestId("SV-001");

    const arranged = await step("API: create a lead for an active sales user", () => createLeadForSalesUser());
    const starts = siteVisitAt();
    const ends = followUpAt();
    const agenda = `appium conducted ${Date.now().toString(36)}`;
    const token = await step("API: sign in as the sales user", () =>
      new SessionApi().accessToken(arranged.salesUser.email, settings.credentials.userPassword),
    );
    const offered = await step("API: read the project and type the site visit form offers", () =>
      new SiteVisitsApi(token).screenDefaults(arranged.leadId),
    );
    await step("API: mark follow-ups and site visits from tomorrow 1 PM to 2 PM conducted", () =>
      new ScheduleSlotApi(token).markOpenAt({
        leadId: arranged.leadId,
        salesUserId: arranged.salesUser._id,
        kind: "SiteVisit",
        projectId: offered.project.id,
        scheduledOn: starts,
        endsOn: ends,
      }),
    );

    await loginAs(arranged.salesUser.email, settings.credentials.userPassword);
    const lead = await findLead(arranged.lead.email, `${arranged.lead.firstName} ${arranged.lead.lastName}`);
    const form = await lead.openScheduleSiteVisit();
    await form.selectProject(offered.project.text);
    await form.selectSiteVisitType(offered.type.text);
    await form.setStarts(starts);
    await form.setEnds(ends);
    await form.selectCampaign(arranged.campaign.text);
    await form.enterAgenda(agenda);

    await step("UI: the form shows the chosen project and campaign", async () => {
      expect(normalize.caseInsensitive(await form.shownProject())).toBe(normalize.caseInsensitive(offered.project.text));
      expect(normalize.caseInsensitive(await form.shownCampaign())).toBe(normalize.caseInsensitive(arranged.campaign.text));
    });

    const outcome = await form.save();
    await step("UI: Schedule closes the form with no error", async () => {
      attachJson("Schedule outcome", outcome);
      expect(outcome.errors).toEqual([]);
      expect(outcome.formClosed).toBe(true);
    });

    const detail = await step("Flow: the conversation page shows the visit scheduled for tomorrow 1 PM", async () => {
      await lead.showSiteVisits();
      const feed = await lead.waitForText("The visit is scheduled");
      expect(feed).toContain(visitWhen(starts).toLowerCase());
      expect(feed).toContain("scheduled");
      return lead;
    });
    await step("UI: the site visit campaign matches the lead campaign", async () => {
      const feed = await detail.revealVisitCampaign(arranged.campaign.text);
      expect(feed).toContain(arranged.campaign.text.toLowerCase());
    });

    const conducted = await detail.chooseVisitAction("Mark as conducted", LeadDetailLocators.conductedForm);
    const conductedAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const update = await conducted.markConducted(conductedAt, "Visited the site");
    await step("UI: the visit is marked conducted", async () => {
      attachJson("Conducted outcome", update);
      expect(update.errors).toEqual([]);
      expect(update.formClosed).toBe(true);
    });

    const saved = await step("API: read the site visit back", () => new SiteVisitsApi().byAgenda(arranged.leadId, agenda));
    await step("API: the visit is conducted for the chosen project, time and campaign", async () =>
      expectFields("Site visit", {
        status: { actual: saved.status, expected: "conducted" },
        project: { actual: saved.projectId, expected: offered.project.id },
        "campaign id": { actual: saved.campaignId, expected: arranged.campaign.id },
        "campaign name": { actual: saved.campaignName, expected: arranged.campaign.text, normalize: normalize.caseInsensitive },
        "scheduled at": { actual: saved.scheduledOn, expected: utcStamp(starts), normalize: utcMinute },
      }),
    );
    await step("UI: the conversation feed shows the visit as conducted", async () => {
      const feed = await detail.waitForText("It was conducted");
      expect(feed).toContain("conducted");
    });
  });
});
