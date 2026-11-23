---
name: selldo-appium-test
description: Add or fix an Appium test for the Sell.do Flutter mobile app (crm-flutter) - derive screens and locators from Dart source, find the backend API and data providers in sell-do/crm feature-crm-2.0-dev, write locator/screen/flow files and a one-test spec with API, UI and flow assertions, run on a real device or emulator, and triage failures from screenshots. Use when asked to automate, extend, debug, or review a mobile test in this repo.
---

# Sell.do Mobile Appium Test Authoring

Follow `.cursor/rules/appium-*.mdc` and `selldo-backend-api.mdc`. This skill is the workflow.

## 0. Preflight
```
npm run refs:sync     # latest crm-flutter (feature/mobile-api-v3-migration) + crm (feature-crm-2.0-dev) into .refs/
npm run doctor        # device, Appium, installed sell.do vs domain, API keys
```
Fix every FAIL before writing code. Tests always launch the sell.do app already installed on the device. Never set `appium:app`, `APK_PATH`, or `apkPath`, and never install an APK from the suite. If "Installed sell.do" fails, install that build on the device by hand. If "App build vs domain" fails, the installed app targets another environment — install the matching sell.do build on the device, don't change the check.

## 1. Define the test case before coding
Write the case like a manual tester, then name it:
- **Module** -> folder `tests/specs/<module>/` (from `lib/features/<feature>`).
- **Case id** `<MODULE>-<NNN>` (next free number in that folder).
- **File** `<actor>-<action>-<object>[-<condition>].spec.ts`, e.g. `sales-user-creates-lead-from-add-lead.spec.ts`.
- **Title** `@smoke|@regression @<module> <ID> <Actor> <does X> and <observable outcome>`.
- **Preconditions** -> what Arrange must resolve or create via API.
- **Steps** -> one line per user-visible action.
- **Expected results** grouped as API data, UI, flow, and applicable industry checks (negative, required, duplicate, permission, isolation).
One case = one file. A variant (other role, missing field) is a new file.

## 2. Map the flow from source (no guessing)
For each step write down: screen file, widgets touched, endpoint called, backend controller.
- Screen: `.refs/crm-flutter/lib/features/<feature>/presentation/screens/*.dart`; routing in `lib/app/routes.dart`.
- Conditional UI: search the screen for `if (_catalog.`, `required:`, `visible` - these depend on client configuration.
- Modals: anything opened with `showModalBottomSheet`/`showDialog` becomes its own class with `isModal = true`.
- Interruptions on the path (permissions prompt, What's New, update sheet, OTP) - reuse the login flow.
- Endpoint: `lib/core/constants/api_endpoints.dart` -> `*_api_service.dart`.
- Backend: `git -C .refs/crm show origin/feature-crm-2.0-dev:config/routes.rb` -> controller -> validations / rendered JSON.
- Test data: list every business value the case needs and its data provider (`selldo-backend-api.mdc` -> Data providers). Only domain, client id, full-access key and password may come from config.

## 3. Confirm locators on the device
Navigate by hand to the screen, start `appium` in another terminal, then `npm run inspect`. It prints each element with the `by.*` locator the framework would use. Cross-check against the Dart labels; required fields show `" *"`; dropdowns show `"Label\nValue"`.

## 4. Write code (in this order, each in its own file)
1. `src/api/<Domain>Api.ts` - typed method per endpoint and data provider; doc comment with route + `Controller#action`.
2. `src/data/<Entity>Factory.ts` / resolvers - unique data; config values resolved from data providers.
3. `src/screens/<module>/<Screen>.locators.ts` - locator map only, Dart source note per entry.
4. `src/screens/<module>/<Screen>.screen.ts` - extends `BaseScreen`; `trait`; actions wrapped in `step()`; readers that return displayed values; navigation returns the next screen after `waitUntilShown()`.
5. `src/flows/<module>.flow.ts` - only if the journey is reused by more than one test.
6. `tests/specs/<module>/<scenario>.spec.ts` - the one test case with all its assertions.

Spec template:
```ts
/**
 * LEAD-001 Sales user creates a lead from Add lead.
 * Preconditions: an active sales user; client campaigns and sales stages (data providers).
 * Backend map (sell-do/crm @ feature-crm-2.0-dev):
 *   GET  /client/users.json                              Client::UsersController#index
 *   GET  /client/campaigns/data_provider.json            Client::CampaignsController#data_provider
 *   POST /api/v3/client/leads                            Api::V3::Client::LeadsController#create (via UI)
 *   GET  /api/leads/:type/retrieve_lead                  Api::LeadsController#retrieve_lead
 */
describe("Leads | Add lead", () => {
  it("@smoke @leads LEAD-001 Sales user creates a lead and the backend stores the entered details", async () => {
    await addFeature("Leads"); await addStory("Add lead from the app"); await addSeverity("critical"); await addTestId("LEAD-001");

    // Arrange (API)
    const salesUser = await step("API: get an active sales user", () => usersApi.firstActiveUser(UserRole.Sales));
    const campaign = await step("API: pick a campaign from the campaign data provider", () => configApi.firstCampaign());
    const stage = await step("API: pick a sales stage from the stage data provider", () => configApi.firstSalesStage());
    const lead = LeadFactory.build();

    // Act (UI)
    await loginAs(salesUser.email, settings.credentials.userPassword);
    const form = await openAddLead();
    await form.enterContact(lead);
    await form.selectCampaign(campaign.text);
    await form.selectStage(stage.text);

    // Assert - UI
    await step("UI: form shows the selected campaign and stage", async () => {
      await expect(await form.shownCampaign()).toBe(campaign.text);
      await expect(await form.shownStage()).toBe(stage.text);
    });
    const outcome = await form.save();
    await step("UI: success message is shown and the form closes", async () => { /* expect(outcome...) */ });

    // Assert - API (mobile -> backend)
    const saved = await step("API: retrieve the lead by email", () => leadsApi.retrieveWhenExists(lead.email));
    await step("API: stored lead matches what was entered", () =>
      expectFields("Lead", saved, { first_name: lead.firstName, email: lead.email, phone: lead.phone, owner: salesUser._id, stage: stage.text, campaign: campaign.text }));

    // Assert - flow
    await step("Flow: phone lookup returns the same single lead", async () => { /* expect(byPhone.lead.id).toBe(saved.lead.id) */ });
  });
});
```

## 5. Run and verify
```
npm run typecheck
npm run test:spec -- ./tests/specs/<module>/<scenario>.spec.ts
npm run allure:report
```
A test is done only after it passes on a device. Run it twice to check stability.

## 6. Triage a failure
1. Open the failure screenshot path printed in the console (`reports/screenshots/`) and look at it first.
2. Allure result for the test has: page source, logcat tail, screen recording, every API request/response.
3. Typical causes and fixes:
   - Element "not displayed" while keyboard is up -> field below the keyboard; `type()` scrolls automatically, check the field is not inside a modal.
   - Scroll "not found down and up" -> wrong label (check `npm run inspect`) or field hidden by client config.
   - Unexpected sheet/dialog -> new interruption: map it from Dart and handle it in the flow that triggers it.
   - Login stuck -> OTP-enabled user, installed sell.do build for the wrong environment, or rooted device message in the failure text.
   - Save rejected with a server message -> replay the request the app branch builds (Dart `toFields` + `*_api_service.dart`) against the backend action to decide app vs backend defect.
   - API mismatch -> compare the attached comparison table with backend transforms (phone national format, name sanitising).
4. Never fix flakiness with sleeps or retries; find the condition to wait for. Never weaken an assertion to hide a product defect.
