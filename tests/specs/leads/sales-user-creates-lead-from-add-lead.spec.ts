import { expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { LeadsApi } from "../../../src/api/LeadsApi.ts";
import { UserRole, UsersApi } from "../../../src/api/UsersApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { expectFields } from "../../../src/core/expectFields.ts";
import { normalize } from "../../../src/core/normalize.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { ClientConfigData } from "../../../src/data/ClientConfigData.ts";
import { LeadFactory } from "../../../src/data/LeadFactory.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { HomeScreen } from "../../../src/screens/home/Home.screen.ts";

/**
 * LEAD-001 Sales user creates a lead from Add lead.
 *
 * Preconditions (resolved at runtime, nothing stored):
 *   - an active sales user                     GET  /client/users.json                                Client::UsersController#index
 *   - a campaign the form can save directly    GET  /client/campaigns/data_provider.json              Client::CampaignsController#data_provider
 *   - the first sales stage                    GET  /client/configuration/data_provider_sales_stage.json Client::ConfigurationController#data_provider_sales_stage
 *
 * Under test (driven through the app):
 *   - login                                    POST /mobile/create.json                               MobileController#create
 *   - lead save                                POST /api/v3/client/leads                              Api::V3::Client::LeadsController#create
 *
 * Verification:
 *   - read back by email and by phone          GET  /api/leads/:type/retrieve_lead                    Api::LeadsController#retrieve_lead
 */
describe("Leads | Add lead", () => {
  it("@smoke @leads LEAD-001 Sales user creates a lead and the backend stores the entered details", async () => {
    await addFeature("Leads");
    await addStory("Sales user adds a lead from the app");
    await addSeverity("critical");
    await addTestId("LEAD-001");

    // ---------- Arrange (API) ----------
    const salesUser = await step("API: get an active sales user", () => new UsersApi().firstActiveUser(UserRole.Sales));
    const campaign = await step("API: pick a campaign from the campaign data provider", () =>
      ClientConfigData.campaignForAddLead(),
    );
    const stage = await step("API: pick the first sales stage from the stage data provider", () =>
      ClientConfigData.firstSalesStage(),
    );
    const lead = LeadFactory.build();
    attachJson("Test data", { domain: settings.domain, salesUser: salesUser.email, lead, campaign, stage });

    // ---------- Act (UI) ----------
    const home = await loginAs(salesUser.email, settings.credentials.userPassword);
    const form = await home.openAddLead();
    await form.enterContact(lead);
    await form.selectCampaign(campaign.text);
    await form.selectStage(stage.text);

    // ---------- Assert: UI before save ----------
    await step("UI: the form shows the selected campaign and stage", async () => {
      expect(normalize.caseInsensitive(await form.shownCampaign())).toBe(normalize.caseInsensitive(campaign.text));
      expect(normalize.caseInsensitive(await form.shownStage())).toBe(normalize.caseInsensitive(stage.text));
    });

    const outcome = await form.save();

    // ---------- Assert: UI and flow after save ----------
    await step("UI: Save closes the form without validation or server errors", async () => {
      attachJson("Save outcome", outcome);
      expect(outcome.errors).toEqual([]);
      expect(outcome.formClosed).toBe(true);
    });
    await step("UI: a success message is shown", async () => {
      // lead_form.dart `leadSaveMessage`: "Lead created successfully" unless the server sends its own `message`.
      expect(outcome.successMessage).toMatch(/success/i);
    });
    await step("Flow: the app returns to Home", async () => {
      await new HomeScreen().waitUntilShown();
    });

    // ---------- Assert: API (mobile -> backend) ----------
    const byEmail = await step(`API: retrieve the lead by email ${lead.email}`, () =>
      new LeadsApi().retrieveWhenExists(lead.email),
    );
    await step("API: the stored lead matches what was entered in the app", async () => {
      expect(byEmail.exists).toBe(true);
      const saved = byEmail.lead ?? { id: "" };
      const stageData = saved.stage_data as { id?: string } | undefined;
      const lastCampaign = saved.last_campaign as { id?: string } | undefined;
      expectFields("Lead (app input vs retrieve_lead)", {
        first_name: { actual: saved.first_name, expected: lead.firstName },
        last_name: { actual: saved.last_name, expected: lead.lastName },
        name: { actual: saved.name, expected: `${lead.firstName} ${lead.lastName}` },
        email: { actual: saved.email, expected: lead.email, normalize: normalize.caseInsensitive },
        phone: { actual: saved.phone, expected: lead.phone, normalize: normalize.phone },
        "owner (sales_details.id)": { actual: byEmail.sales_details?.id, expected: salesUser._id },
        "stage (stage_data.id)": { actual: stageData?.id, expected: stage.id },
        "campaign (last_campaign.id)": { actual: lastCampaign?.id, expected: campaign.id },
      });
    });

    // ---------- Assert: flow / data integrity ----------
    await step("Flow: phone lookup returns the same single lead", async () => {
      const byPhone = await new LeadsApi().retrieve(lead.phone);
      expect(byPhone.exists).toBe(true);
      expect(byPhone.lead?.id).toBe(byEmail.lead?.id);
    });
  });
});
