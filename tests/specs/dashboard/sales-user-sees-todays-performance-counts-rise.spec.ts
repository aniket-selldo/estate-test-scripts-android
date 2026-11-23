import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { ClientConfigApi } from "../../../src/api/ClientConfigApi.ts";
import { DashboardApi, type TodaysPerformanceStats } from "../../../src/api/DashboardApi.ts";
import { FollowupsApi } from "../../../src/api/FollowupsApi.ts";
import { currentProjectIds, LeadsApi } from "../../../src/api/LeadsApi.ts";
import { LeadProfileApi } from "../../../src/api/LeadProfileApi.ts";
import { OfflineCallsApi } from "../../../src/api/OfflineCallsApi.ts";
import { ScheduleSlotApi } from "../../../src/api/ScheduleSlotApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { SiteVisitsApi } from "../../../src/api/SiteVisitsApi.ts";
import { UserRole, UsersApi } from "../../../src/api/UsersApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { expectFields } from "../../../src/core/expectFields.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { ClientConfigData } from "../../../src/data/ClientConfigData.ts";
import { pushTarget } from "../../../src/data/LeadProfileData.ts";
import { createOwnedLead } from "../../../src/data/LeadSetup.ts";
import { followUpAt, utcStamp } from "../../../src/data/schedule.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { HomeScreen } from "../../../src/screens/home/Home.screen.ts";
import type { PerformanceCards } from "../../../src/screens/dashboard/TodaysPerformance.screen.ts";

/**
 * DASH-001 Today's Performance rises after a push, an offline call, a site visit and a follow-up.
 *
 * The cards are not live. `POST /api/v3/client/home-dashboard/refresh` enqueues
 * UpdateDashboardStatsWorker, and a sales user's stats response always says the refresh is
 * already done. The test waits up to two minutes (the same 5s poll the app uses for a manager)
 * until `last_refresh_at` moves, then taps Refresh so the screen reads the new Redis numbers.
 *
 * What the worker counts for that sales user, for today in their timezone
 * (`UpdateDashboardStatsWorker#todays_performance`):
 *   - Total Calls / Total Talktime / Average Call Duration: calls created today with status
 *     answered or not_answered. A manually logged offline call (vendor
 *     CallManager::OfflinecallManager, offline true) is included only when
 *     offline_call_strategy is 2. The form flag `schedule_followup` is that case.
 *     Strategy 0 and strategy 1 both leave this call out. Average Call Duration is
 *     total_talktime / total_answered (integer division when both are whole numbers).
 *   - Average Callback Time: the average callback_time of incoming missed calls only.
 *     An outbound answered offline call does not change it.
 *   - Time to First Contact: the average `ttfc` of leads created today for this user,
 *     and only while pre-sales is enabled. It is an average, so a new lead can move it
 *     either way. The card must show the recomputed value.
 *   - Site Visits Created: visits this user initiated today (`initiated_by`).
 *   - Site Visits Scheduled: visits this user initiated whose scheduled_on is today.
 *   - Site Visits Conducted: visits whose conducted_on is today and sales_id is this user.
 *   - Followup Scheduled: follow-ups created today with sales_id this user
 *     (created_at, not the appointment time).
 *   - Leads from Pre-Sales: `pushed_to_sales`. For a sales user that is leads pushed
 *     today that they now own (`from_pre_sales`: pushed_by exists, currently_in sales,
 *     pushed_on today, primary sales person is them).
 *
 * Backend map (sell-do/crm @ feature-crm-2.0-dev):
 *   GET  /api/v3/client/home-dashboard/stats                 Api::V3::Client::HomeDashboardController#stats
 *   POST /api/v3/client/home-dashboard/refresh               Api::V3::Client::HomeDashboardController#refresh
 *   POST /api/v3/client/leads/:id/push_to_sales              Api::V3::Client::Leads::SalesPushesController#create
 *   GET  /api/v3/client/leads/:id/offline_calls/new          V3::Leads::OfflineCalls::Form#flags
 *   POST /api/v3/client/leads/:id/offline_calls              Api::V3::Client::Leads::OfflineCallsController#create
 *   POST /api/v3/client/leads/:id/site_visits                V3::Leads::SiteVisits::Create
 *   PATCH /api/v3/client/site_visits/:id/status              V3::SiteVisits::UpdateStatus
 *   POST /api/v3/client/leads/:id/followups                  client/leads/followups#create
 */
describe("Dashboard | Today's Performance", () => {
  it("@regression @dashboard DASH-001 Sales user refreshes Today's Performance and the cards match the activity added through the API", async function () {
    this.timeout(8 * 60_000);
    await addFeature("Dashboard");
    await addStory("Today's Performance counts");
    await addSeverity("critical");
    await addTestId("DASH-001");

    const password = settings.credentials.userPassword;
    const presales = await step("API: get an active pre-sales user", () => new UsersApi().firstActiveUser(UserRole.PreSales));
    const presalesToken = await step("API: sign in as the pre-sales user", () => new SessionApi().accessToken(presales.email, password));
    const presalesProfile = new LeadProfileApi(presalesToken);
    const config = new ClientConfigApi();
    const push = await step("API: read pre-sales push settings", () => config.pushSettings(presalesToken));
    if (!push.enabled) {
      throw new Error(
        "Pre-sales is turned off, so Leads from Pre-Sales is left at 0. Enable pre-sales to count a push on Today's Performance.",
      );
    }
    const project = await step("API: pick a project", () => ClientConfigData.firstProject());
    const target = await step("API: pick the team or project Push to sales offers", () =>
      pushTarget(presalesProfile, push.byProject, push.byProject ? project.id : ""),
    );
    const salesDirectory = await step("API: list active sales users", () => new UsersApi().listAllActiveUsers(UserRole.Sales));
    const chosen = salesDirectory.find((user) => user._id === target.user?.id);
    if (!push.autoForward && !chosen) {
      throw new Error("Push to sales asks for a sales person, and that person is not an active sales user");
    }

    // A named sales person can be measured before the push. Auto-forward picks the owner
    // during the push, so that recompute already contains the new lead.
    let baseline: TodaysPerformanceStats | undefined;
    let countThePush = true;
    if (!push.autoForward && chosen) {
      const earlyToken = await step("API: sign in as the sales user who will receive the lead", () =>
        new SessionApi().accessToken(chosen.email, password),
      );
      baseline = await step("API: recompute Today's Performance before adding anything", () =>
        new DashboardApi(earlyToken).afterRecompute(() => true),
      );
    }

    const owned = await step("API: create a lead for pre-sales with the project", () => createOwnedLead(presales, project.id));
    const qualified = await step("API: move the lead off the incoming stage", async () => {
      const form = await presalesProfile.stageForm(owned.leadId);
      if (form.current !== "incoming" && form.current !== "") return form.current;
      const stage = presalesProfile.movableStage(form, ["incoming"]);
      await presalesProfile.changeStage(owned.leadId, stage);
      return stage.id;
    });
    await step("API: the lead has the interested project", async () => {
      if (owned.projectIds.includes(project.id)) return;
      await presalesProfile.addProject(owned.leadId, project.id, owned.lead);
      const saved = await new LeadsApi().retrieveWhenExists(owned.lead.email);
      expect(currentProjectIds(saved.lead)).toContain(project.id);
    });
    await step("API: push the lead to sales", () =>
      presalesProfile.pushToSales(owned.leadId, {
        ...(push.byProject ? { projectId: target.group.id } : { teamId: target.group.id }),
        ...(push.autoForward || !chosen ? {} : { salesId: chosen._id }),
      }),
    );

    const pushed = await step("API: the lead is now owned by a sales user", async () => {
      const saved = await new LeadsApi().retrieveWhenExists(owned.lead.email);
      expect(saved.lead?.currently_in).toBe("sales");
      const ownerId = saved.sales_details?.id ?? "";
      if (!ownerId) throw new Error(`Pushed lead ${owned.lead.email} has no sales owner`);
      if (!push.autoForward && chosen) expect(ownerId).toBe(chosen._id);
      const owner = salesDirectory.find((user) => user._id === ownerId);
      if (!owner) {
        throw new Error(
          `The lead was pushed to ${ownerId}, who is not an active sales user. A manager's dashboard sums the team, so this case stays on a sales user.`,
        );
      }
      return owner;
    });
    const salesToken = await step("API: sign in as the sales owner", () => new SessionApi().accessToken(pushed.email, password));
    const calls = new OfflineCallsApi(salesToken);
    const countsLoggedCalls = await step("API: read whether a logged offline call counts today", () =>
      calls.countsManuallyLogged(owned.leadId),
    );
    const dashboard = new DashboardApi(salesToken);
    if (push.autoForward) {
      baseline = await step("API: recompute Today's Performance after the push", () => dashboard.afterRecompute(() => true));
      countThePush = false;
    }
    if (!baseline) throw new Error("Today's Performance baseline was not read");
    const starting = baseline;
    const owner = pushed;
    attachJson("Measured sales user", {
      email: owner.email,
      countsLoggedCalls,
      countThePush,
      qualified,
      group: target.group.text,
      baseline: starting,
    });

    await loginAs(owner.email, password);
    const screen = await new HomeScreen().openTodaysPerformance();
    const beforeUi = await screen.readCards();
    await step("UI: the cards show the recomputed baseline", async () => {
      expectPerformance("Baseline", beforeUi, displayedCards(starting));
    });

    const followups = new FollowupsApi(salesToken);
    const offered = await step("API: read the follow-up form", () => followups.screen(owned.leadId));
    const zone = offered.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const callPlan = answeredCall(starting, zone);
    const visit = laterToday(zone);
    const followUp = followUpAt();
    const stamp = Date.now().toString(36);
    const note = `Appium offline call ${stamp}`;
    const agenda = `Appium site visit ${stamp}`;
    const subject = `Appium follow-up ${stamp}`;
    attachJson("Activity added for the sales user", { callPlan, visit: utcStamp(visit.start), zone, countsLoggedCalls });

    const logged = await step("API: log an outbound answered offline call", () =>
      calls.logAnswered({
        leadId: owned.leadId,
        calledAt: callPlan.calledAt,
        durationSeconds: callPlan.durationSeconds,
        notes: note,
      }),
    );
    await step("API: the call is stored as an outbound answered call", async () => {
      expect(logged.status).toBe("answered");
      expect(logged.direction).toBe(2);
      expect(logged.duration).toBe(callPlan.durationSeconds);
      const row = await new LeadProfileApi(salesToken).recordWhen(owned.leadId, "Call", (fields) =>
        String(fields.notes ?? "").includes(note),
      );
      expect(String(row.fields.status ?? "")).toBe("answered");
    });

    const siteVisits = new SiteVisitsApi(salesToken);
    const visitForm = await step("API: read the site visit form", () => siteVisits.screenDefaults(owned.leadId));
    const campaign = await step("API: pick a campaign for the site visit", () => ClientConfigData.campaignForAddLead());
    await step("API: clear the site-visit slot", () =>
      new ScheduleSlotApi(salesToken).markOpenAt({
        leadId: owned.leadId,
        salesUserId: owner._id,
        kind: "SiteVisit",
        scheduledOn: visit.start,
        endsOn: visit.end,
        projectId: visitForm.project.id,
      }),
    );
    const visitId = await step("API: schedule a site visit for later today", () =>
      siteVisits.schedule(owned.leadId, {
        projectId: visitForm.project.id,
        typeId: visitForm.type.id,
        scheduledOn: utcStamp(visit.start),
        endsOn: utcStamp(visit.end),
        campaignId: campaign.id,
        agenda,
      }),
    );
    await step("API: mark that site visit conducted", () => siteVisits.setStatus(visitId, "conducted"));
    await step("API: the visit was created, scheduled today and conducted", async () => {
      const saved = await siteVisits.byAgenda(owned.leadId, agenda);
      expect(saved.id).toBe(visitId);
      expect(saved.status).toBe("conducted");
    });

    await step("API: clear the follow-up slot", () =>
      new ScheduleSlotApi(salesToken).markOpenAt({
        leadId: owned.leadId,
        salesUserId: owner._id,
        kind: "Followup",
        scheduledOn: followUp,
        endsOn: followUp,
      }),
    );
    const custom: Record<string, string> = {};
    for (const field of offered.requiredFields) custom[field.name] = valueFor(field.type);
    await step("API: schedule a follow-up", () =>
      followups.schedule(owned.leadId, {
        typeId: offered.type.id,
        scheduledOn: utcStamp(followUp),
        subject,
        agenda: `Call the lead ${stamp}`,
        custom,
      }),
    );
    await step("API: the follow-up is scheduled and owned by the sales user", async () => {
      const saved = await followups.bySubject(owned.leadId, subject);
      expect(saved.status).toBe("scheduled");
      expect(saved.followupType).toBe(offered.type.id);
    });

    const expected = expectedCards(starting, {
      includeCall: countsLoggedCalls,
      durationSeconds: callPlan.durationSeconds,
      countThePush,
    });
    const refreshed = await step("API: recompute Today's Performance and wait up to 2 minutes", () =>
      dashboard.afterRecompute((stats) => sameCards(displayedCards(stats), expected)),
    );
    await screen.refresh();
    const afterUi = await screen.readCards();

    await step("UI: each card shows the recomputed count", async () => {
      expectPerformance("Today's Performance", afterUi, {
        ...expected,
        timeToFirstContact: displayed(refreshed.timeToFirstContact),
      });
    });
    await step("API: the worker stored those same counts", async () => {
      expectPerformance("Stats API", { ...displayedCards(refreshed), lastUpdated: "" }, {
        ...expected,
        timeToFirstContact: displayed(refreshed.timeToFirstContact),
      });
    });
    await step("Flow: Refresh still shows the last-updated line", async () => {
      expect(afterUi.lastUpdated.startsWith("Last updated on ")).toBe(true);
    });
  });
});

interface PredictedCards {
  totalCalls: number;
  totalTalktime: number;
  averageCallDuration: number;
  averageCallbackTime: number;
  timeToFirstContact: number;
  siteVisitsCreated: number;
  siteVisitsScheduled: number;
  siteVisitsConducted: number;
  followupsScheduled: number;
  leadsFromPreSales: number;
}

/** What the cards show for a fresh stats payload. Time to first contact is filled from the recompute. */
function displayedCards(stats: TodaysPerformanceStats): PredictedCards {
  return {
    totalCalls: displayed(stats.totalCalls),
    totalTalktime: displayed(stats.totalTalktime),
    averageCallDuration: displayed(stats.avgCallDuration),
    averageCallbackTime: displayed(stats.avgCallbackTime),
    timeToFirstContact: displayed(stats.timeToFirstContact),
    siteVisitsCreated: displayed(stats.siteVisitsCreated),
    siteVisitsScheduled: displayed(stats.siteVisitsScheduled),
    siteVisitsConducted: displayed(stats.siteVisitsConducted),
    followupsScheduled: displayed(stats.followupsScheduled),
    leadsFromPreSales: displayed(stats.leadsFromPreSales),
  };
}

function expectedCards(
  before: TodaysPerformanceStats,
  change: { includeCall: boolean; durationSeconds: number; countThePush: boolean },
): PredictedCards {
  const calls = before.totalCalls + (change.includeCall ? 1 : 0);
  const talktime = before.totalTalktime + (change.includeCall ? change.durationSeconds : 0);
  const answered = before.totalAnswered + (change.includeCall ? 1 : 0);
  return {
    totalCalls: displayed(calls),
    totalTalktime: displayed(talktime),
    averageCallDuration: displayed(answered === 0 ? 0 : rubyDivide(talktime, answered)),
    averageCallbackTime: displayed(before.avgCallbackTime),
    timeToFirstContact: displayed(before.timeToFirstContact),
    siteVisitsCreated: displayed(before.siteVisitsCreated) + 1,
    siteVisitsScheduled: displayed(before.siteVisitsScheduled) + 1,
    siteVisitsConducted: displayed(before.siteVisitsConducted) + 1,
    followupsScheduled: displayed(before.followupsScheduled) + 1,
    leadsFromPreSales: displayed(before.leadsFromPreSales) + (change.countThePush ? 1 : 0),
  };
}

function sameCards(actual: PredictedCards, expected: PredictedCards): boolean {
  return (Object.keys(expected) as (keyof PredictedCards)[])
    .filter((key) => key !== "timeToFirstContact")
    .every((key) => actual[key] === expected[key]);
}

/** `num.round` in dashboard_stats.dart, then a negative result is shown as 0. */
function displayed(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
}

/** Ruby `/` truncates when both operands are integers, which is how the worker divides talktime. */
function rubyDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  if (Number.isInteger(numerator) && Number.isInteger(denominator)) return Math.trunc(numerator / denominator);
  return numerator / denominator;
}

function expectPerformance(title: string, actual: PerformanceCards | (PredictedCards & { lastUpdated: string }), expected: PredictedCards & { lastUpdated?: string }): void {
  expectFields(title, {
    "Total Calls": { actual: actual.totalCalls, expected: String(expected.totalCalls) },
    "Total Talktime": { actual: actual.totalTalktime, expected: String(expected.totalTalktime) },
    "Average Call Duration": { actual: actual.averageCallDuration, expected: String(expected.averageCallDuration) },
    "Average Callback Time": { actual: actual.averageCallbackTime, expected: String(expected.averageCallbackTime) },
    "Time to First Contact": { actual: actual.timeToFirstContact, expected: String(expected.timeToFirstContact) },
    "Site Visits Created": { actual: actual.siteVisitsCreated, expected: String(expected.siteVisitsCreated) },
    "Site Visits Scheduled": { actual: actual.siteVisitsScheduled, expected: String(expected.siteVisitsScheduled) },
    "Site Visits Conducted": { actual: actual.siteVisitsConducted, expected: String(expected.siteVisitsConducted) },
    "Followup Scheduled": { actual: actual.followupsScheduled, expected: String(expected.followupsScheduled) },
    "Leads from Pre-Sales": { actual: actual.leadsFromPreSales, expected: String(expected.leadsFromPreSales) },
  });
}

/**
 * An answered call whose duration is longer than the current average, so Average Call
 * Duration rises when the strategy counts the call. `called_at` stays inside today in
 * the sales user's timezone, and the call ends before now.
 */
function answeredCall(before: TodaysPerformanceStats, timeZone: string): { durationSeconds: number; calledAt: string } {
  const average = before.totalAnswered === 0 ? 0 : before.totalTalktime / before.totalAnswered;
  const now = new Date();
  const clock = zonedClock(now, timeZone);
  const elapsed = clock.hour * 3600 + clock.minute * 60 + clock.second;
  const room = Math.max(60, elapsed - 90);
  const durationSeconds = Math.min(Math.max(60, Math.ceil(average) + 60), room);
  const calledAt = new Date(now.getTime() - (durationSeconds + 30) * 1000);
  return { durationSeconds, calledAt: calledAt.toISOString() };
}

/** Twenty minutes from now, still today in `timeZone`, so the visit counts as scheduled today. */
function laterToday(timeZone: string): { start: Date; end: Date } {
  const start = new Date(Date.now() + 20 * 60_000);
  const today = zonedClock(new Date(), timeZone);
  const then = zonedClock(start, timeZone);
  if (then.day !== today.day || then.month !== today.month || then.year !== today.year) {
    throw new Error(`A site visit 20 minutes from now falls on the next day in ${timeZone}, so it would not count as scheduled today`);
  }
  return { start, end: new Date(start.getTime() + 30 * 60_000) };
}

function zonedClock(date: Date, timeZone: string): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  return { year: read("year"), month: read("month"), day: read("day"), hour: read("hour"), minute: read("minute"), second: read("second") };
}

function valueFor(type: string): string {
  if (type === "number") return "1";
  if (type === "text" || type === "textarea") return "noted";
  throw new Error(`The follow-up form requires a ${type} field. Fill that field on the schedule call before the dashboard can count it.`);
}
