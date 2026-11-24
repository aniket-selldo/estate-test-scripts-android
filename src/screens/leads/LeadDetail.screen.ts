import { $, driver } from "@wdio/globals";
import { BaseScreen } from "../../core/BaseScreen.ts";
import { by } from "../../core/locators.ts";
import { step } from "../../core/reporting.ts";
import { OfflineCallScreen } from "../calls/OfflineCall.screen.ts";
import { ReplyEmailScreen } from "../emails/ReplyEmail.screen.ts";
import { CancelFollowupScreen } from "../follow-ups/CancelFollowup.screen.ts";
import { ScheduleFollowupScreen } from "../follow-ups/ScheduleFollowup.screen.ts";
import { ConductedSiteVisitScreen } from "../site-visits/ConductedSiteVisit.screen.ts";
import { ScheduleSiteVisitScreen } from "../site-visits/ScheduleSiteVisit.screen.ts";
import { UpdateSiteVisitScreen } from "../site-visits/UpdateSiteVisit.screen.ts";
import { AddNoteSheet } from "./AddNote.screen.ts";
import { DeleteLeadSheet } from "./DeleteLead.screen.ts";
import { MergeLeadScreen } from "./MergeLead.screen.ts";
import { LeadsListScreen } from "./LeadsList.screen.ts";
import { LeadDetailLocators as L } from "./LeadDetail.locators.ts";
import { LeadMoreSheet } from "./LeadMore.screen.ts";
import { LeadStageSheet } from "./LeadStage.screen.ts";

export class LeadDetailScreen extends BaseScreen {
  protected readonly name = "Lead detail";
  protected readonly trait = L.leadOverview;

  /** Opens the lead whose name is shown in the search results. */
  async openFromList(leadName: string): Promise<this> {
    return step(`Open lead "${leadName}"`, async () => {
      const row = $(L.leadNamed(leadName));
      await row.waitForDisplayed({ timeout: this.timeout, timeoutMsg: `Lead "${leadName}" is not in the search results` });
      await row.click();
      return this.waitUntilShown();
    });
  }

  async openScheduleSiteVisit(): Promise<ScheduleSiteVisitScreen> {
    return step("Open Schedule site visit", async () => {
      await this.tap(L.siteVisitAction);
      return new ScheduleSiteVisitScreen().waitUntilShown();
    });
  }

  async openScheduleFollowUp(): Promise<ScheduleFollowupScreen> {
    return step("Open Add follow-up", async () => {
      await this.tap(L.followUpAction);
      return new ScheduleFollowupScreen().waitUntilShown();
    });
  }

  async openAddNote(): Promise<AddNoteSheet> {
    return step("Open Add note", async () => {
      await this.tap(L.note);
      return new AddNoteSheet().waitUntilShown();
    });
  }

  async openOfflineCall(): Promise<OfflineCallScreen> {
    const more = await this.openMore();
    return more.logOfflineCall();
  }

  async openConductedSiteVisit(): Promise<ConductedSiteVisitScreen> {
    const more = await this.openMore();
    return more.addConductedSiteVisit();
  }

  async openMerge(): Promise<MergeLeadScreen> {
    const more = await this.openMore();
    return more.mergeLead();
  }

  async openDelete(): Promise<DeleteLeadSheet> {
    const more = await this.openMore();
    return more.deleteLead();
  }

  /** Opens the more-actions sheet (Edit lead, Reassign lead, Push, Merge, Delete). */
  async openMore(): Promise<LeadMoreSheet> {
    return step("Open more lead actions", async () => {
      await this.tap(L.more);
      return new LeadMoreSheet().waitUntilShown();
    });
  }

  /** The stage chip shows the current stage name and opens Change stage. */
  async openStage(stageName: string): Promise<LeadStageSheet> {
    return step(`Open Change stage from "${stageName}"`, async () => {
      await this.tap(byStage(stageName));
      return new LeadStageSheet().waitUntilShown();
    });
  }

  /** The conversation feed tab that lists stage changes, reassignment and push to sales. */
  async showNotes(): Promise<void> {
    await this.openTab("Notes", L.notes);
  }

  async showCalls(): Promise<void> {
    await this.openTab("Calls", L.calls);
  }

  async showMergedLeads(): Promise<void> {
    await this.openTab("Merge leads", L.mergeLeads);
  }

  async showFeed(): Promise<void> {
    await step("Open the Feed tab", async () => {
      await this.revealTab(L.feed);
      await this.tap(L.feed);
      if (await $(L.refresh).isDisplayed()) await this.tap(L.refresh);
    });
  }

  /** Lead detail is pushed over the dashboard. Back returns to the leads list, where the drawer can log out. */
  async backToList(): Promise<LeadsListScreen> {
    return step("Go back to the leads list", async () => {
      await this.tap(by.a11y("Back"));
      return new LeadsListScreen().waitUntilShown();
    });
  }

  /** Every visible label, so the spec can compare the access banner with the API text. */
  async shownText(): Promise<string> {
    return (await this.visibleLabels()).join("\n");
  }

  /** The conversation feed tab that lists this lead's site visits. The tab bar scrolls sideways. */
  async showSiteVisits(): Promise<void> {
    await step("Open the Site visits tab on the conversation feed", async () => {
      await this.revealTab(L.siteVisits);
      await this.tap(L.siteVisits);
      if (await $(L.refresh).isDisplayed()) await this.tap(L.refresh);
    });
  }

  /** The lead opens on Overview, where the follow-up card offers Mark as conducted. */
  async showOverview(): Promise<void> {
    await step("Open the Overview tab", async () => {
      await this.revealTab(L.overview);
      await this.tap(L.overview);
    });
  }

  /** The conversation tab that lists this lead's emails. The card title is the subject. */
  async showEmails(): Promise<void> {
    await this.openTab("Emails", L.emails);
  }

  /** Reply and Reply all are pinned on an email the signed-in user owns. */
  async emailActionVisible(label: "Reply" | "Reply all"): Promise<boolean> {
    try {
      await this.scrollTo(L.cardAction(label));
      return true;
    } catch {
      return false;
    }
  }

  /** Opens Reply or Reply all on the card whose title contains the subject. */
  async openEmailReply(subject: string, replyAll: boolean): Promise<ReplyEmailScreen> {
    const label = replyAll ? "Reply all" : "Reply";
    return step(`Choose ${label} on "${subject}"`, async () => {
      await this.waitForText(subject);
      await this.scrollTo(L.cardAction(label));
      await this.tap(L.cardAction(label));
      return new ReplyEmailScreen().waitUntilShown();
    });
  }

  /**
   * Taps More. Returns whether the Email row is on the sheet.
   * A user with no more-actions at all gets the snackbar and no sheet
   * (open_lead_more.dart), which also means Email was not offered.
   */
  async emailActionOffered(): Promise<boolean> {
    return step("Open more lead actions and look for Email", async () => {
      await this.tap(L.more);
      const sheet = new LeadMoreSheet();
      const denied = $(by.a11yContains("You are not allowed to perform this action"));
      await driver.waitUntil(async () => (await sheet.isShown()) || (await denied.isDisplayed()), {
        timeout: this.timeout,
        timeoutMsg: "More actions did not open and no access message was shown",
      });
      if (!(await sheet.isShown())) return false;
      const offered = await sheet.hasEmail();
      await driver.back();
      await sheet.waitUntilGone();
      return offered;
    });
  }

  async showFollowUps(): Promise<void> {
    await step("Open the Follow-ups tab on the conversation feed", async () => {
      await this.revealTab(L.followUps);
      await this.tap(L.followUps);
      if (await $(L.refresh).isDisplayed()) await this.tap(L.refresh);
    });
  }

  private async openTab(label: string, selector: string): Promise<void> {
    await step(`Open the ${label} tab`, async () => {
      await this.revealTab(selector);
      await this.tap(selector);
      if (await $(L.refresh).isDisplayed()) await this.tap(L.refresh);
    });
  }

  private async revealTab(selector: string): Promise<void> {
    const tab = $(selector);
    if (await tab.isDisplayed()) return;
    const { width } = await driver.getWindowSize();
    const y = await this.tabBarY();
    const swipe = async (from: number, to: number) => {
      await driver
        .action("pointer", { parameters: { pointerType: "touch" } })
        .move({ x: Math.round(width * from), y })
        .down()
        .move({ x: Math.round(width * to), y, duration: 600 })
        .pause(250)
        .up()
        .perform();
    };
    for (const [from, to] of [
      [0.85, 0.15],
      [0.15, 0.85],
    ] as const) {
      for (let attempt = 0; attempt < 6; attempt++) {
        if (await tab.isDisplayed()) return;
        await swipe(from, to);
      }
    }
    throw new Error(`Lead detail tab not found. Visible: ${(await this.visibleLabels()).join(" || ")}`);
  }

  /** Vertical centre of a tab that is on screen. Several tabs share resource-id `detail.tab`. */
  private async tabBarY(): Promise<number> {
    const source = await driver.getPageSource();
    for (const node of source.matchAll(/<[^>\s]+[^>]*resource-id="detail\.tab"[^>]*>/g)) {
      const attrs = node[0];
      if (!attrs.includes('displayed="true"')) continue;
      const bounds = attrs.match(/bounds="\[\d+,(\d+)\]\[\d+,(\d+)\]"/);
      if (bounds) return Math.round((Number(bounds[1]) + Number(bounds[2])) / 2);
    }
    throw new Error("Lead detail tab bar is not on screen");
  }

  /** Text the feed is currently exposing (statuses, campaign, times). */
  async feedText(): Promise<string> {
    return (await this.visibleLabels()).join("\n");
  }

  /**
   * The feed paints skeleton cards first, and a long title is one label
   * (`The visit is scheduled on 20/11/2026, 01:00 PM.`). Agenda is not on the card.
   */
  async waitForText(fragment: string): Promise<string> {
    const needle = fragment.toLowerCase();
    let feed = "";
    const deadline = Date.now() + this.timeout;
    let nudged = 0;
    while (Date.now() < deadline) {
      feed = (await this.feedText()).toLowerCase();
      if (feed.includes(needle)) return feed;
      if (nudged < 6) {
        await this.drag(nudged < 4 ? "down" : "up");
        nudged += 1;
      }
    }
    throw new Error(`Lead detail did not show "${fragment}". Visible: ${feed.slice(0, 1500)}`);
  }

  /**
   * Campaign is not on the card until "View campaign" (lead_detail_feed.dart).
   * The panel labels the campaign name row "Name".
   */
  async revealVisitCampaign(campaignName: string, cardText = "The visit is scheduled"): Promise<string> {
    return step("Show the site visit campaign", async () => {
      await this.tap(L.moreActionsOn(cardText));
      await this.tap(L.viewCampaign);
      const needle = campaignName.toLowerCase();
      let feed = "";
      const deadline = Date.now() + this.timeout;
      while (Date.now() < deadline) {
        const labels = (await this.visibleLabels()).map((label) => label.toLowerCase());
        feed = labels.join("\n");
        // The card merges its lines into one label: "... | name | organic".
        const onTheVisit = labels.some((label) => label.includes("| name |") && label.includes(needle));
        if (onTheVisit) return feed;
      }
      throw new Error(`Site visit campaign was not shown. Visible: ${feed.slice(0, 1500)}`);
    });
  }

  /**
   * "Mark as conducted" and "Reschedule" are buttons on the card.
   * Everything else, including "Mark not interested", is under More actions.
   */
  async chooseVisitAction(label: string, opened: string): Promise<UpdateSiteVisitScreen> {
    return step(`Choose "${label}" on the site visit`, async () => {
      const direct = $(L.cardAction(label));
      if (await direct.isDisplayed()) await direct.click();
      else {
        await this.tap(L.moreActionsOn("The visit is scheduled"));
        await this.tap(L.menuItem(label));
      }
      return new UpdateSiteVisitScreen(label, opened).waitUntilShown();
    });
  }

  /**
   * Subject and agenda are behind "View agenda" (lead_activity_actions.dart).
   * That button is pinned on the card. Opening the overflow menu first covers it,
   * and the next tap only dismisses the menu.
   * The sheet shows "Subject - ..." and "Agenda - ...".
   */
  async revealFollowupAgenda(subject: string, agenda: string): Promise<string> {
    return step("Show the follow-up subject and agenda", async () => {
      await this.tap(L.viewAgenda);
      const subjectLine = `subject - ${subject.toLowerCase()}`;
      const agendaLine = `agenda - ${agenda.toLowerCase()}`;
      let feed = "";
      const deadline = Date.now() + this.timeout;
      while (Date.now() < deadline) {
        feed = (await this.feedText()).toLowerCase();
        if (feed.includes(subjectLine) && feed.includes(agendaLine)) {
          if (await $(L.closeSheet).isDisplayed()) await this.tap(L.closeSheet);
          return feed;
        }
      }
      throw new Error(`Follow-up agenda was not shown. Visible: ${feed.slice(0, 1500)}`);
    });
  }

  /**
   * The Overview follow-up card always offers this button
   * (`canConductFollowUp: true` in lead_detail_screen.dart).
   * The feed card only shows it when `allow_direct_conduct_followup` is on.
   */
  async markFollowupConducted(): Promise<void> {
    await step("Mark the follow-up as conducted", async () => {
      const button = L.cardAction("Mark as conducted");
      try {
        await this.scrollTo(button);
      } catch {
        throw new Error(
          'The Overview follow-up card has no "Mark as conducted" button. Open Overview before marking the follow-up conducted.',
        );
      }
      await this.tap(button);
    });
  }

  /** "Cancel follow-up" is in the overflow menu when the follow-up is still open and owned by this user. */
  async openCancelFollowUp(): Promise<CancelFollowupScreen> {
    return step("Choose Cancel follow-up", async () => {
      await this.tap(L.moreActionsOn("A followup"));
      await this.tap(L.cancelFollowUp);
      return new CancelFollowupScreen().waitUntilShown();
    });
  }
}

/** Stage chip label (lead_detail_header.dart). The name comes from the lead, not from a locator file. */
function byStage(stageName: string): string {
  return by.a11yIgnoreCase(stageName);
}
