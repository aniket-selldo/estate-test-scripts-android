import { by } from "../../core/locators.ts";

/**
 * lib/features/leads/presentation/screens/push_to_sales_screen.dart
 * The group label is "Project" when `pre_sales.push_lead_strategy` is project, otherwise "Team".
 * Sales person is hidden when `auto_forward` is on.
 */
export const PushToSalesLocators = {
  /**
   * The app bar title. The button uses the same words and can drop out of the tree while the
   * request is in flight, so the title is what shows the screen is still open.
   */
  title: '//*[@content-desc="Push to sales" and @clickable="false"]',
  team: by.formField("Team"), // Key('lead-push-group')
  project: by.formField("Project"), // Key('lead-push-group')
  salesPerson: by.formField("Sales person"), // Key('lead-push-user')
  /** The button, not the app bar title, which has the same words. Key('lead-push-save'). */
  save: by.clickable("Push to sales"),
  /** The toast is "Lead pushed to sales" (push_to_sales_screen.dart). It may be text or content-desc. */
  savedSnackbar:
    '//*[contains(translate(@content-desc, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "pushed to sales") or contains(translate(@text, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "pushed to sales")]',
} as const;
