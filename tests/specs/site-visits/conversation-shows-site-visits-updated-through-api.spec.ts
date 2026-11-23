import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { ScheduleSlotApi } from "../../../src/api/ScheduleSlotApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { SiteVisitsApi } from "../../../src/api/SiteVisitsApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { expectFields } from "../../../src/core/expectFields.ts";
import { normalize } from "../../../src/core/normalize.ts";
import { step } from "../../../src/core/reporting.ts";
import { ClientConfigData } from "../../../src/data/ClientConfigData.ts";
import { createLeadForSalesUser } from "../../../src/data/LeadSetup.ts";
import { atLocalTime, followUpAt, siteVisitAt, utcMinute, utcStamp, visitWhen } from "../../../src/data/schedule.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { findLead } from "../../../src/flows/leads.flow.ts";

/**
 * SV-004 The lead conversation page shows site visits whose status was set through the API.
 * One lead gets three visits: conducted, rescheduled (still `scheduled`, at 2 PM) and not interested (`dropped`).
 * POST /api/v3/client/leads/:id/site_visits, PATCH /api/v3/client/site_visits/:id and .../status.
 *
 * A lead cannot have two visits for the same project within a minute
 * (`SiteVisit#validate_site_visit_uniqueness`). Each visit uses a different project
 * when the client has more than one; otherwise the starts are two minutes apart.
 */
describe("Site visits | Conversation feed", () => {
  it("@regression @site-visits SV-004 The conversation page shows site visits conducted, rescheduled and marked not interested through the API", async () => {
    await addFeature("Site visits");
    await addStory("Conversation feed reflects API status changes");
    await addSeverity("critical");
    await addTestId("SV-004");

    const arranged = await step("API: create a lead for an active sales user", () => createLeadForSalesUser());
    const projects = await step("API: pick a project for each site visit", () => ClientConfigData.projects(3));
    const atTwo = followUpAt();
    const atThree = atLocalTime(1, 15);
    const tag = Date.now().toString(36);
    const kinds = ["conducted", "rescheduled", "dropped"] as const;
    const agendas = {
      conducted: `appium feed conducted ${tag}`,
      rescheduled: `appium feed rescheduled ${tag}`,
      dropped: `appium feed dropped ${tag}`,
    };
    const seen = new Map<string, number>();
    const starts = Object.fromEntries(
      kinds.map((kind, index) => {
        const project = projects[index] ?? projects[0];
        const taken = seen.get(project.id) ?? 0;
        seen.set(project.id, taken + 1);
        return [kind, { project, when: atLocalTime(1, siteVisitAt().getHours(), taken * 2) }];
      }),
    ) as Record<(typeof kinds)[number], { project: (typeof projects)[number]; when: Date }>;
    const token = await step("API: sign in as the sales user", () =>
      new SessionApi().accessToken(arranged.salesUser.email, settings.credentials.userPassword),
    );
    const visits = new SiteVisitsApi(token);
    const calendar = new ScheduleSlotApi(token);

    await step("API: schedule three site visits for tomorrow 1 PM", async () => {
      for (const kind of kinds) {
        const slot = starts[kind];
        const ends = new Date(slot.when.getTime() + 60 * 60 * 1000);
        await calendar.markOpenAt({
          leadId: arranged.leadId,
          salesUserId: arranged.salesUser._id,
          kind: "SiteVisit",
          projectId: slot.project.id,
          scheduledOn: slot.when,
          endsOn: ends,
        });
        await visits.schedule(arranged.leadId, {
          projectId: slot.project.id,
          typeId: arranged.siteVisitType.id,
          scheduledOn: utcStamp(slot.when),
          endsOn: utcStamp(ends),
          campaignId: arranged.campaign.id,
          agenda: agendas[kind],
        });
      }
    });
    await step("API: mark one conducted, move one to 2 PM and mark one not interested", async () => {
      const conducted = await visits.byAgenda(arranged.leadId, agendas.conducted);
      const rescheduled = await visits.byAgenda(arranged.leadId, agendas.rescheduled);
      const dropped = await visits.byAgenda(arranged.leadId, agendas.dropped);
      await calendar.markOpenAt({
        leadId: arranged.leadId,
        salesUserId: arranged.salesUser._id,
        kind: "SiteVisit",
        projectId: starts.rescheduled.project.id,
        scheduledOn: atTwo,
        endsOn: atThree,
        exceptActivityId: rescheduled.id,
      });
      await visits.setStatus(conducted.id, "conducted", utcStamp(new Date(Date.now() - 60 * 60 * 1000)));
      await visits.reschedule(rescheduled.id, utcStamp(atTwo), utcStamp(atThree));
      await visits.setStatus(dropped.id, "dropped");
    });

    await step("API: each visit has the status, time and campaign that was set", async () => {
      const conducted = await visits.byAgenda(arranged.leadId, agendas.conducted);
      const rescheduled = await visits.byAgenda(arranged.leadId, agendas.rescheduled);
      const dropped = await visits.byAgenda(arranged.leadId, agendas.dropped);
      expectFields("Conducted visit", {
        status: { actual: conducted.status, expected: "conducted" },
        project: { actual: conducted.projectId, expected: starts.conducted.project.id },
        "campaign id": { actual: conducted.campaignId, expected: arranged.campaign.id },
        "campaign name": { actual: conducted.campaignName, expected: arranged.campaign.text, normalize: normalize.caseInsensitive },
      });
      expectFields("Rescheduled visit", {
        status: { actual: rescheduled.status, expected: "scheduled" },
        project: { actual: rescheduled.projectId, expected: starts.rescheduled.project.id },
        "scheduled at": { actual: rescheduled.scheduledOn, expected: utcStamp(atTwo), normalize: utcMinute },
        "campaign id": { actual: rescheduled.campaignId, expected: arranged.campaign.id },
        "campaign name": { actual: rescheduled.campaignName, expected: arranged.campaign.text, normalize: normalize.caseInsensitive },
      });
      expectFields("Not interested visit", {
        status: { actual: dropped.status, expected: "dropped" },
        project: { actual: dropped.projectId, expected: starts.dropped.project.id },
        "campaign id": { actual: dropped.campaignId, expected: arranged.campaign.id },
        "campaign name": { actual: dropped.campaignName, expected: arranged.campaign.text, normalize: normalize.caseInsensitive },
      });
    });

    await loginAs(arranged.salesUser.email, settings.credentials.userPassword);
    const lead = await findLead(arranged.lead.phone, `${arranged.lead.firstName} ${arranged.lead.lastName}`);
    await lead.showSiteVisits();
    await step("UI: the Site visits tab shows conducted, rescheduled and not interested", async () => {
      const conducted = await lead.waitForText("It was conducted");
      expect(conducted).toContain("conducted");
      const rescheduled = await lead.waitForText(visitWhen(atTwo));
      expect(rescheduled).toContain("the visit is scheduled");
      expect(rescheduled).toContain("scheduled");
      const dropped = await lead.waitForText("no longer interested");
      expect(dropped).toContain("dropped");
    });
    await step("UI: a site visit on the conversation page shows the campaign", async () => {
      const feed = await lead.revealVisitCampaign(arranged.campaign.text, "It was conducted");
      expect(feed).toContain(arranged.campaign.text.toLowerCase());
    });
  });
});
