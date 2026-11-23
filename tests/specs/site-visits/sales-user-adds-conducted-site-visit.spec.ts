import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { LeadProfileApi } from "../../../src/api/LeadProfileApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { SiteVisitsApi } from "../../../src/api/SiteVisitsApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { expectFields } from "../../../src/core/expectFields.ts";
import { normalize } from "../../../src/core/normalize.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { createLeadForSalesUser } from "../../../src/data/LeadSetup.ts";
import { atLocalTime, utcMinute, utcStamp, visitWhen } from "../../../src/data/schedule.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { findLead } from "../../../src/flows/leads.flow.ts";
import { LeadDetailScreen } from "../../../src/screens/leads/LeadDetail.screen.ts";

/**
 * SV-005 Sales user logs a site visit that already happened.
 *
 * Preconditions: an active sales user, a lead assigned to that user, and the project
 * and type offered by GET /api/v3/client/leads/:id/site_visits/new.
 * Under test: Add conducted site visit
 * (POST /api/v3/client/leads/:id/site_visits with status conducted).
 * The app stores agenda "customer visited" and the notes the user typed.
 * The conducted time has to be before now. This case uses yesterday 10:00 AM.
 * Read back: GET /client/leads/:id/activities.json?filters[_type]=SiteVisit.
 *
 * The create endpoint currently drops status, conducted_on and notes and schedules
 * the visit, so a past conducted time is rejected. This case still expects Save to
 * succeed. See the conducted-visit contract gap in selldo-backend-api.mdc.
 */
describe("Site visits | Add conducted", () => {
  it("@regression @site-visits SV-005 Sales user adds a conducted site visit and the feed shows it was conducted", async () => {
    await addFeature("Site visits");
    await addStory("Add a conducted site visit");
    await addSeverity("critical");
    await addTestId("SV-005");

    const arranged = await step("API: create a lead for an active sales user", () => createLeadForSalesUser());
    const token = await step("API: sign in as the sales user", () =>
      new SessionApi().accessToken(arranged.salesUser.email, settings.credentials.userPassword),
    );
    const visits = new SiteVisitsApi(token);
    await step("API: the lead allows a conducted site visit", async () => {
      const access = await new LeadProfileApi(token).access(arranged.leadId);
      expect(access.conductedSiteVisit).toBe(true);
    });
    const offered = await step("API: read the project and type the conducted form offers", () => visits.screenDefaults(arranged.leadId));
    const conductedAt = atLocalTime(-1, 10);
    const notes = `Appium conducted visit ${Date.now().toString(36)}`;

    await loginAs(arranged.salesUser.email, settings.credentials.userPassword);
    const lead = await findLead(arranged.lead.email, `${arranged.lead.firstName} ${arranged.lead.lastName}`);
    const form = await lead.openConductedSiteVisit();
    await form.selectProject(offered.project.text);
    await form.selectSiteVisitType(offered.type.text);
    await form.setConductedOn(conductedAt);
    await form.selectCampaign(arranged.campaign.text);
    await form.enterNotes(notes);

    await step("UI: the form shows the chosen project and campaign", async () => {
      expect(normalize.caseInsensitive(await form.shownProject())).toBe(normalize.caseInsensitive(offered.project.text));
      expect(normalize.caseInsensitive(await form.shownCampaign())).toBe(normalize.caseInsensitive(arranged.campaign.text));
    });

    const outcome = await form.save();
    await step("UI: Save closes the form and confirms the visit was conducted", async () => {
      attachJson("Conducted visit outcome", outcome);
      expect(outcome.errors).toEqual([]);
      expect(outcome.formClosed).toBe(true);
      expect(outcome.successMessage).toMatch(/conducted successfully/i);
    });

    await step("UI: the Site visits tab says the visit was conducted yesterday at 10:00 AM", async () => {
      const screen = await new LeadDetailScreen().waitUntilShown();
      await screen.showSiteVisits();
      const feed = await screen.waitForText("It was conducted");
      expect(feed).toContain("conducted");
      expect(feed).toContain(visitWhen(conductedAt).toLowerCase());
    });

    const saved = await step("API: read the conducted visit back by its notes", () => new SiteVisitsApi().byNotes(arranged.leadId, notes));
    await step("API: the visit is conducted for the chosen project, time, campaign and notes", async () =>
      expectFields("Conducted site visit", {
        status: { actual: saved.status, expected: "conducted" },
        project: { actual: saved.projectId, expected: offered.project.id },
        "campaign id": { actual: saved.campaignId, expected: arranged.campaign.id },
        "campaign name": { actual: saved.campaignName, expected: arranged.campaign.text, normalize: normalize.caseInsensitive },
        notes: { actual: saved.notes, expected: notes },
        "conducted at": { actual: saved.conductedOn || saved.scheduledOn, expected: utcStamp(conductedAt), normalize: utcMinute },
        type: { actual: saved.typeId, expected: offered.type.id },
      }),
    );
  });
});
