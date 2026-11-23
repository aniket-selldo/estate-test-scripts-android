# Sell.do CRM Mobile - Appium automation

End-to-end tests for the Flutter app [sell-do/crm-flutter](https://github.com/sell-do/crm-flutter) on Android,
with setup and verification through the sell.do backend API ([sell-do/crm](https://github.com/sell-do/crm), `feature-crm-2.0-dev`).

Stack: WebdriverIO 10 + Mocha + Appium 3 (UiAutomator2) + TypeScript, Allure reporting.

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 22+ |
| Java JDK | 17+ (`JAVA_HOME` set) |
| Android SDK | platform-tools on `PATH`, `ANDROID_HOME` set |
| Appium | 3.x, `npm i -g appium` |
| UiAutomator2 driver | `appium driver install uiautomator2` |

```powershell
npm install
npm run doctor      # checks tools, device, app build vs domain, API keys
```

## Configure: `automation.config.ts`

Everything a user changes lives in this one file. Every value can also be overridden by an environment variable (shown in the file), which is how CI should pass secrets.

| Section | What to set |
|---|---|
| `domain` | `v2.sell.do`, `v2b.sell.do` or `app.sell.do` |
| `credentials` | `clientId`, `fullAccessApiKey`, `userPassword` - the only stored test values |
| `device.type` | `"real"` (USB) or `"virtual"` (emulator) |
| `device.udid` / `device.avdName` | optional serial of the phone; AVD name to boot for `virtual` |
| `app.appPackage` | `sell.do` — the app already installed on the device. The suite never installs an APK |
| `test` | spec globs, grep tag, retries, timeouts, video on failure, Appium port |

Everything else a test needs is read at runtime with the full-access key: users by role, campaigns, stages and the website (restricted) API key. Business values are never stored in config or code.

Tests always launch the sell.do app already installed on the phone or emulator. The suite does not install or replace it. The installed build's backend host is compiled in. Before a run, the framework reads that host from the installed package and stops if it does not belong to the configured domain. `v2`, `v2a` and `v2b` share the staging database, so they count as one environment.

## Run

```powershell
npm test                   # all specs
npm run test:smoke         # tests tagged @smoke
npm run test:spec -- ./tests/specs/leads/createLeadAsSales.spec.ts
npm run allure:report      # build and open the HTML report
npm run inspect            # dump the current screen with suggested locators
npm run refs:sync          # update the app and backend source used for mapping
```

The Appium server is started by the WebdriverIO service (`test.appium.startServer`); do not run another one on the same port.

## Architecture

```
automation.config.ts         single user config
src/config/                  schema, env overrides, capabilities, device + installed-app host checks
src/api/                     typed sell.do API clients incl. data providers (HttpClient retries GETs, redacts keys)
src/data/                    factories (unique data) and client-config pickers
src/core/                    BaseScreen, locator builders, reporting, expectFields, normalize
src/screens/<module>/        <Screen>.locators.ts (locators only) + <Screen>.screen.ts (actions, readers)
src/screens/components/      shared sheets and dialogs, same two-file split
src/flows/                   journeys reused by many tests (login)
tests/specs/<module>/        one test case per file, with all of its assertions
scripts/                     doctor, inspect-screen, sync-refs
.cursor/rules, .cursor/skills  conventions for writing new tests and locators
```

Locators: Flutter `Key`s are not visible to UiAutomator2, so screens use what Flutter exposes: accessibility labels (`~Save`), TextField labels via the `hint` attribute, and dropdown labels via `content-desc`. Each locator is commented with its Dart `Key`. Adding `Semantics(identifier: ...)` in the app would expose `resource-id`s and give the most stable locators.

## Reporting

- Allure: steps, API request/response JSON, test data, and the field-by-field comparison table.
- On failure: a screenshot (attached and saved under `reports/screenshots/`), page source, the last 300 logcat lines, and a screen recording.

## Device compatibility matrix

The app's `minSdk` is 32, so Android 12L or newer is required.

| Device | Type | Android | ABI | Status |
|---|---|---|---|---|
| vivo V2025 (`6d1fc028`) | Real, USB | 13 | arm64-v8a | Verified (installed split APK) |
| `Small_Phone_2` AVD | Emulator | 17 (API 37) | x86_64 | Needs sell.do already installed (universal or x86_64). The suite does not install it |
| Android 12L-16 phones | Real / emulator | 12L+ | arm64 / x86_64 | Expected to work, not yet verified |
| Android 12 and older | Any | below API 32 | - | Not supported by the app |

Add a row whenever a new device or OS version is run.

## Current tests

| Test | Flow |
|---|---|
| `leads/sales-user-creates-lead-from-add-lead.spec.ts` (`@smoke`, LEAD-001) | Resolve a sales user, campaign and stage via API; log in; add a lead with random name, email and phone. Assert the form shows the picks, Save closes with a success message, Home is shown, `retrieve_lead` returns the same name, email, phone, owner, stage and campaign, and the phone lookup returns the same lead |
| `site-visits/sales-user-schedules-site-visit-and-marks-it-conducted.spec.ts` (SV-001) | Create a lead via API, search it, schedule a visit for tomorrow 1 PM in the app, mark it conducted. Check project, time, campaign and status |
| `site-visits/sales-user-marks-scheduled-site-visit-not-interested.spec.ts` (SV-002) | Schedule the visit via API, mark it not interested in the app (`dropped`) |
| `site-visits/sales-user-reschedules-site-visit.spec.ts` (SV-003) | Schedule via API for 1 PM, reschedule to 2 PM in the app |
| `site-visits/conversation-shows-site-visits-updated-through-api.spec.ts` (SV-004) | Set conducted, rescheduled and not interested via API and check the Site visits tab |
| `follow-ups/sales-user-schedules-follow-up.spec.ts` (FU-001) | Create a lead via API, search it, schedule a follow-up for tomorrow 1 PM in the app. Check the time, type, subject, agenda and status |
| `follow-ups/sales-user-marks-follow-up-conducted.spec.ts` (FU-002) | Schedule the follow-up via API, mark it conducted in the app |
| `follow-ups/sales-user-cancels-follow-up.spec.ts` (FU-003) | Schedule the follow-up via API, cancel it in the app with a reason and note |
| `leads/sales-user-adds-note-and-feed-shows-it.spec.ts` (LEAD-009) | Add a note on the lead. The Notes tab and the note activity store the same text |
| `leads/sales-user-merges-duplicate-lead.spec.ts` (LEAD-010) | Merge a second lead into the open one. The feed names the duplicate and the kept email stays |
| `leads/sales-user-sees-custom-column-on-lead-list.spec.ts` (LEAD-011) | Add a custom field column. The lead card shows that field and the value from the custom-fields API |
| `leads/admin-deletes-lead.spec.ts` (LEAD-012) | An admin deletes a lead with Delete only. `retrieve_lead` then reports it gone |
| `site-visits/sales-user-adds-conducted-site-visit.spec.ts` (SV-005) | Log a visit that already happened (yesterday 10:00 AM) as conducted |
| `calls/sales-user-logs-inbound-answered-call-in-minutes.spec.ts` (CALL-001) | Inbound, answered, 2 minutes |
| `calls/sales-user-logs-inbound-answered-call-in-seconds.spec.ts` (CALL-002) | Inbound, answered, 30 seconds |
| `calls/sales-user-logs-outbound-answered-call-in-minutes.spec.ts` (CALL-003) | Outbound, answered, 2 minutes |
| `calls/sales-user-logs-outbound-answered-call-in-seconds.spec.ts` (CALL-004) | Outbound, answered, 30 seconds |
| `calls/sales-user-logs-inbound-missed-call.spec.ts` (CALL-005) | Inbound, not answered, no duration |
| `calls/sales-user-logs-outbound-missed-call.spec.ts` (CALL-006) | Outbound, not answered, no duration |

### Known product defect

On the current v3 app build, Save on Add lead fails with "both email and phone of lead can't be blank". The app (`feature/mobile-api-v3-migration`) sends `lead.primary_email` / `lead.primary_phone` to `POST /api/v3/client/leads`, while the backend (`V3::Leads::Create`) reads `lead.emails_attributes[]` / `lead.phones_attributes[]`. The smoke test fails at Save until one side is changed.

Scheduling and rescheduling a site visit from the app also fail. Before create or reschedule the app calls `GET /api/v3/client/activities/scheduled_events`, which is not in `config/routes/v3_routes.rb` and answers 404 `{ "error": "Template not found" }`. `PATCH /api/v3/client/site_visits/:id` itself returns 200. SV-001 and SV-003 stay red at the save button until that route exists. SV-002 (status `dropped`) and SV-004 (status changes through the API) do not call it. Follow-up create catches the same lookup failure and still saves.

Cancelling a follow-up from the app asks `GET /api/v3/workflows/lookups?type=followup_cancellation_reasons` for the reason list. For the sales user that lookup returns 403 Forbidden, even though the same reasons are on the follow-up form. FU-003 stays red at the reason field until the screen can load a reason.

Logging an offline call fills Direction, Status and When, then Save is rejected with "Direction is required. Status is required. Date and time are required." The app posts those values nested under `offline_call` and names the time `created_at`. The backend reads them as top-level `direction`, `status` and `called_at`. CALL-001 through CALL-006 stay red at Save until the two payloads match. A saved missed call is stored as `not_answered`.

Adding a conducted site visit fills Project, type, a past conducted time and notes, then Save is rejected with "Scheduled on cannot be in the past for a scheduled site visit." The app posts `status: conducted`, `conducted_on` and `notes`. `V3::Leads::SiteVisits::Create` drops those keys and schedules the visit, so yesterday's time fails the scheduled-visit rule. SV-005 stays red at Save until the create endpoint accepts a conducted visit.
