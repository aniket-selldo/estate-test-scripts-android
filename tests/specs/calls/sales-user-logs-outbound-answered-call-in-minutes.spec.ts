import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { LeadProfileApi } from "../../../src/api/LeadProfileApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { UserRole, UsersApi } from "../../../src/api/UsersApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { expectFields } from "../../../src/core/expectFields.ts";
import { normalize } from "../../../src/core/normalize.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { createOwnedLead } from "../../../src/data/LeadSetup.ts";
import { atLocalTime, utcMinute, utcStamp } from "../../../src/data/schedule.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { findLead } from "../../../src/flows/leads.flow.ts";
import { LeadDetailScreen } from "../../../src/screens/leads/LeadDetail.screen.ts";

/**
 * CALL-003 Sales user logs an outbound answered offline call in minutes.
 *
 * Direction Outbound is `2`. Two minutes are stored as 120 seconds.
 * The card says "You had an outgoing call with the lead" and "with a duration of 2 min."
 *
 * The app posts `{ offline_call: { created_at, direction, status } }`.
 * `OfflineCallParams` reads top-level `called_at`, `direction` and `status`,
 * so Save currently returns "Direction is required. Status is required. Date and time are required."
 * The assertion stays.
 */
describe("Calls | Offline call", () => {
  it("@regression @calls CALL-003 Sales user logs an outbound answered call of 2 minutes", async () => {
    await addFeature("Calls");
    await addStory("Log an outbound answered offline call in minutes");
    await addSeverity("critical");
    await addTestId("CALL-003");

    const salesUser = await step("API: get an active sales user", () => new UsersApi().firstActiveUser(UserRole.Sales));
    const owned = await step("API: create a lead assigned to that user", () => createOwnedLead(salesUser));
    const token = await step("API: sign in as the sales user", () =>
      new SessionApi().accessToken(salesUser.email, settings.credentials.userPassword),
    );
    const profile = new LeadProfileApi(token);
    await step("API: the lead allows an offline call", async () => {
      const access = await profile.access(owned.leadId);
      expect(access.offlineCall).toBe(true);
    });
    const when = atLocalTime(-1, 10);
    const note = `Appium outbound answered minutes ${Date.now().toString(36)}`;

    await loginAs(salesUser.email, settings.credentials.userPassword);
    const detail = await findLead(owned.lead.email, `${owned.lead.firstName} ${owned.lead.lastName}`);
    const form = await detail.openOfflineCall();
    await form.selectDirection("Outbound");
    await form.selectStatus("Answered");

    await step("UI: an answered call asks for a duration", async () => {
      expect(await form.showsDuration()).toBe(true);
      expect(await form.shownDirection()).toBe("Outbound");
      expect(await form.shownStatus()).toBe("Answered");
    });

    await form.setWhen(when);
    await form.enterDuration("2");
    await form.selectUnit("Minute(s)");

    await step("UI: the duration unit is minutes", async () => {
      expect(await form.shownUnit()).toBe("Minute(s)");
    });

    await form.enterNote(note);
    const outcome = await form.save();
    await step("UI: Save closes the form and confirms the call was added", async () => {
      attachJson("Offline call outcome", outcome);
      expect(outcome.errors).toEqual([]);
      expect(outcome.formClosed).toBe(true);
      expect(outcome.successMessage).toMatch(/Call details added successfully/i);
    });

    await step("UI: the Calls tab shows an outgoing answered call of 2 minutes", async () => {
      const screen = await new LeadDetailScreen().waitUntilShown();
      await screen.showCalls();
      const feed = await screen.waitForText("outgoing call");
      expect(feed).toContain("outgoing");
      expect(feed).toContain("offline");
      expect(feed).toContain("duration of 2 min");
    });

    const saved = await step("API: read the call back by its note", () =>
      profile.recordWhen(owned.leadId, "Call", (fields) => String(fields.notes ?? "") === note),
    );
    await step("API: the call is outbound, answered, 120 seconds, at yesterday 10:00 AM", async () =>
      expectFields("Offline call", {
        direction: { actual: saved.fields.direction, expected: "2" },
        status: { actual: saved.fields.status, expected: "answered", normalize: normalize.caseInsensitive },
        duration: { actual: saved.fields.duration, expected: "120" },
        notes: { actual: saved.fields.notes, expected: note },
        "call time": { actual: saved.fields.created_at, expected: utcStamp(when), normalize: utcMinute },
      }),
    );
  });
});
