import { by } from "../../core/locators.ts";

/**
 * lib/features/dashboard/presentation/screens/dashboard_screen.dart (app bar tooltips)
 * lib/features/dashboard/presentation/widgets/global_action_menu.dart (Add menu)
 */
export const HomeLocators = {
  /** Flutter `DrawerButton` tooltip. */
  openMenu: by.a11y("Open navigation menu"),
  leads: by.a11y("Leads"),
  notifications: by.a11y("Notifications"), // IconButton tooltip
  add: by.a11y("Add"), // global action button tooltip
  addLead: by.a11y("Add lead"), // menu item, hidden when the role cannot create leads (canCreateLead)
  /**
   * Debug builds set resource-id `drawer.logout` and `drawer.logout.confirm`
   * (TestId in dashboard_drawer.dart). The label is "Logout".
   */
  logout: by.id("drawer.logout"),
  confirmLogout: by.id("drawer.logout.confirm"),
} as const;
