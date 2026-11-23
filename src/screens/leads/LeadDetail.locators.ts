import { by, xpathLiteral } from "../../core/locators.ts";
import { UpdateSiteVisitLocators } from "../site-visits/UpdateSiteVisit.locators.ts";

/**
 * One tab in the lead detail tab bar.
 * Debug builds set resource-id `detail.tab` (TestId in lead_detail_screen.dart).
 * TalkBack reads the position first: "Tab 3 of 12\nFollow-ups".
 * An older build put the label first: "Follow-ups\nTab 3 of 12".
 */
function detailTab(label: string): string {
  const afterNewline = xpathLiteral(`\n${label}`);
  const labelFirst = xpathLiteral(`${label}\n`);
  return `//*[@clickable="true" and (@resource-id="detail.tab" or contains(@content-desc, "Tab ")) and (contains(@content-desc, ${afterNewline}) or starts-with(@content-desc, ${labelFirst}))]`;
}

/**
 * lib/features/leads/presentation/screens/lead_detail_screen.dart
 * lib/features/leads/presentation/widgets/lead_detail/lead_detail_action_bar.dart (tooltips)
 * lib/features/leads/presentation/widgets/lead_detail/lead_detail_feed.dart (tabs, "More actions")
 */
export const LeadDetailLocators = {
  /**
   * Overview is the tab the lead opens on.
   * `_Tabs` in lead_detail_screen.dart wraps each tab in TestId('detail.tab').
   * The installed app exposes "Tab n of m\nOverview". An older build used "Overview\nTab n of m".
   */
  overview: detailTab("Overview"),
  leadOverview: by.a11y("Lead overview"),
  /** Conversation tab that lists stage, reassign and push feeds (lead_activity.dart). */
  feed: detailTab("Feed"),
  notes: detailTab("Notes"),
  calls: detailTab("Calls"),
  mergeLeads: detailTab("Merge leads"),
  siteVisits: detailTab("Site visits"),
  followUps: detailTab("Follow-ups"),
  /** Action bar Note button. Debug builds set resource-id `lead.action.note`. */
  note: by.id("lead.action.note"),
  /**
   * Round more (+) button. Debug builds set resource-id `lead.action.more`
   * (TestId in lead_detail_action_bar.dart). The tooltip is "More".
   */
  more: by.id("lead.action.more"),
  refresh: by.a11y("Refresh"),
  siteVisitAction: by.a11y("Site visit"),
  /** Action bar tooltip (lead_detail_action_bar.dart). */
  followUpAction: by.a11y("Follow-up"),
  viewAgenda: by.a11y("View agenda"),
  cancelFollowUp: by.a11y("Cancel follow-up"),
  /** Agenda sheet close (lead_activity_actions.dart `_ActivitySheet`, tooltip "Close"). */
  closeSheet: by.clickable("Close"),
  /** The lead card title is the full name, e.g. "Isac Greenholt". */
  leadNamed: (name: string) => by.a11yContains(name),
  /**
   * Overflow button on the visit card (`_MoreButton`, tooltip "More actions").
   * UiAutomator2 puts that tooltip on the card and leaves the button itself with no content-desc.
   * It is the only unlabeled clickable inside the summary that contains `cardText`.
   */
  moreActionsOn: (cardText: string) =>
    `//*[contains(@content-desc, ${xpathLiteral(cardText)})]//*[@clickable="true" and not(@content-desc)]`,
  /** Overflow entries such as "Mark not interested" and "View campaign" (lead_detail_feed.dart). */
  menuItem: (label: string) => by.a11y(label),
  viewCampaign: by.a11y("View campaign"),
  /** Pinned on the card: "Mark as conducted" and "Reschedule". Overflow actions use the menu. */
  cardAction: (label: string) => by.clickable(label),
  conductedForm: UpdateSiteVisitLocators.conductedOn,
  rescheduleForm: UpdateSiteVisitLocators.rescheduleOn,
  /** The dropped form has a Notes field; the menu item shares the title "Mark not interested". */
  notInterestedForm: UpdateSiteVisitLocators.notes,
} as const;
