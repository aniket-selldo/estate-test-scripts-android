import { $ } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { OfflineCallScreen } from "../calls/OfflineCall.screen.ts";
import { SendEmailScreen } from "../emails/SendEmail.screen.ts";
import { ConductedSiteVisitScreen } from "../site-visits/ConductedSiteVisit.screen.ts";
import { DeleteLeadSheet } from "./DeleteLead.screen.ts";
import { EditLeadScreen } from "./EditLead.screen.ts";
import { LeadMoreLocators as L } from "./LeadMore.locators.ts";
import { MergeLeadScreen } from "./MergeLead.screen.ts";
import { PushToSalesScreen } from "./PushToSales.screen.ts";
import { ReassignLeadScreen } from "./ReassignLead.screen.ts";

export class LeadMoreSheet extends BaseScreen {
  protected readonly name = "Lead more actions";
  protected readonly trait = L.title;
  protected readonly isModal = true;

  async sendEmail(): Promise<SendEmailScreen> {
    return step("Choose Email", async () => {
      await this.tap(L.email);
      return new SendEmailScreen().waitUntilShown();
    });
  }

  /** The Email row is present only when this user may email the lead. */
  async hasEmail(): Promise<boolean> {
    return $(L.email).isDisplayed();
  }

  async editLead(): Promise<EditLeadScreen> {
    return step("Choose Edit lead", async () => {
      await this.tap(L.editLead);
      return new EditLeadScreen().waitUntilShown();
    });
  }

  async reassignLead(): Promise<ReassignLeadScreen> {
    return step("Choose Reassign lead", async () => {
      await this.tap(L.reassignLead);
      return new ReassignLeadScreen().waitUntilShown();
    });
  }

  async pushToSales(): Promise<PushToSalesScreen> {
    return step("Choose Push", async () => {
      await this.tap(L.push);
      return new PushToSalesScreen().waitUntilShown();
    });
  }

  async hasPush(): Promise<boolean> {
    return $(L.push).isDisplayed();
  }

  async logOfflineCall(): Promise<OfflineCallScreen> {
    return step("Choose Log offline call", async () => {
      await this.tap(L.offlineCall);
      return new OfflineCallScreen().waitUntilShown();
    });
  }

  async addConductedSiteVisit(): Promise<ConductedSiteVisitScreen> {
    return step("Choose Add conducted site visit", async () => {
      await this.tap(L.conductedSiteVisit);
      return new ConductedSiteVisitScreen().waitUntilShown();
    });
  }

  async mergeLead(): Promise<MergeLeadScreen> {
    return step("Choose Merge lead", async () => {
      await this.tap(L.merge);
      return new MergeLeadScreen().waitUntilShown();
    });
  }

  async deleteLead(): Promise<DeleteLeadSheet> {
    return step("Choose Delete lead", async () => {
      await this.tap(L.deleteLead);
      return new DeleteLeadSheet().waitUntilShown();
    });
  }
}
