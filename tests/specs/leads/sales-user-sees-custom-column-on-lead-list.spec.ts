import { driver, expect } from "@wdio/globals";
import { addFeature, addSeverity, addStory, addTestId } from "@wdio/allure-reporter";
import { ListingColumnsApi } from "../../../src/api/ListingColumnsApi.ts";
import { SessionApi } from "../../../src/api/SessionApi.ts";
import { UserRole, UsersApi } from "../../../src/api/UsersApi.ts";
import { settings } from "../../../src/config/environment.ts";
import { normalize } from "../../../src/core/normalize.ts";
import { attachJson, step } from "../../../src/core/reporting.ts";
import { createOwnedLead } from "../../../src/data/LeadSetup.ts";
import { loginAs } from "../../../src/flows/auth.flow.ts";
import { HomeScreen } from "../../../src/screens/home/Home.screen.ts";

/**
 * LEAD-011 A custom field added in the column sheet is drawn on the lead card.
 *
 * Preconditions: an active sales user, a lead assigned to that user, and an active
 * lead custom field from GET /api/v3/custom_fields/autocomplete?class_type=lead.
 * Under test: the Fields sheet (lead_column_sheet.dart). Apply stores the choice
 * on the device and the card reads GET /api/v3/client/leads/:id/custom_fields.
 * A blank value is drawn as "-".
 */
describe("Leads | Listing columns", () => {
  it("@regression @leads LEAD-011 Sales user adds a custom column and the lead card shows that field", async () => {
    await addFeature("Leads");
    await addStory("Custom column on the lead list");
    await addSeverity("normal");
    await addTestId("LEAD-011");

    const salesUser = await step("API: get an active sales user", () => new UsersApi().firstActiveUser(UserRole.Sales));
    const owned = await step("API: create a lead assigned to that user", () => createOwnedLead(salesUser));
    const token = await step("API: sign in as the sales user", () =>
      new SessionApi().accessToken(salesUser.email, settings.credentials.userPassword),
    );
    const columns = new ListingColumnsApi(token);
    const column = await step("API: pick an active lead custom field", async () => {
      const field = await columns.firstLeadCustomField();
      const query = await columns.queryThatFinds(field.label);
      attachJson("Custom column", { ...field, query });
      expect(field.id.startsWith("custom_")).toBe(true);
      return { ...field, query };
    });
    const stored = await step("API: read that field on the lead", async () => {
      const values = await columns.valuesForLead(owned.leadId);
      return (
        values.find((item) => item.id === column.id || item.label.toLowerCase() === column.label.toLowerCase()) ?? {
          id: column.id,
          label: column.label,
          value: "",
        }
      );
    });
    const shownValue = stored.value.trim() === "" ? "-" : stored.value;

    await loginAs(salesUser.email, settings.credentials.userPassword);
    const list = await new HomeScreen().openLeads();
    const reset = await list.openColumns();
    await reset.reset();
    await list.search(owned.lead.email);

    await step("UI: the card does not show the custom field before it is added", async () => {
      const card = await list.shownText();
      expect(card.toLowerCase()).not.toContain(column.label.toLowerCase());
    });

    const sheet = await list.openColumns();
    await sheet.addCustomField(column.label, column.query);
    await sheet.apply();
    await list.search(owned.lead.email);

    const leadName = `${owned.lead.firstName} ${owned.lead.lastName}`;
    await step("UI: the lead card shows the custom field and the value from the API", async () => {
      await driver.waitUntil(async () => (await list.shownText()).toLowerCase().includes(leadName.toLowerCase()), {
        timeout: settings.test.elementTimeoutMs,
        timeoutMsg: `Lead "${leadName}" was not on the list. Visible: ${await list.shownText()}`,
      });
      const card = (await list.shownText()).toLowerCase();
      expect(card).toContain(leadName.toLowerCase());
      expect(card).toContain(column.label.toLowerCase());
      expect(card).toContain(shownValue.toLowerCase());
    });

    await step("API: the lead custom field value is the text on the card", async () => {
      const again = await columns.valuesForLead(owned.leadId);
      const match = again.find((item) => item.id === column.id || normalize.caseInsensitive(item.label) === normalize.caseInsensitive(column.label));
      expect(match?.value ?? "").toBe(stored.value);
    });
  });
});
