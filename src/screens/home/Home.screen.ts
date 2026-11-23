import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { LoginScreen } from "../auth/Login.screen.ts";
import { AddLeadScreen } from "../leads/AddLead.screen.ts";
import { LeadsListScreen } from "../leads/LeadsList.screen.ts";
import { HomeLocators as L } from "./Home.locators.ts";

export class HomeScreen extends BaseScreen {
  protected readonly name = "Home dashboard";
  protected readonly trait = L.notifications;

  async openLeads(): Promise<LeadsListScreen> {
    return step("Open Leads from the navigation menu", async () => {
      await this.waitUntilShown();
      await this.tap(L.openMenu);
      await this.tap(L.leads);
      return new LeadsListScreen().waitUntilShown();
    });
  }

  /** Drawer Logout, then the confirm sheet. Lands on the login screen. */
  async logout(): Promise<LoginScreen> {
    return step("Log out", async () => {
      await this.waitUntilShown();
      await this.tap(L.openMenu);
      await this.scrollTo(L.logout);
      await this.tap(L.logout);
      await this.tap(L.confirmLogout);
      return new LoginScreen().waitUntilShown();
    });
  }

  async openAddLead(): Promise<AddLeadScreen> {
    return step("Open Add lead from the global Add menu", async () => {
      await this.waitUntilShown();
      await this.tap(L.add);
      await this.tap(L.addLead);
      return new AddLeadScreen().waitUntilShown();
    });
  }
}
