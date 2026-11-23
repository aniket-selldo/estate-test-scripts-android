import { by } from "../../core/locators.ts";

/** lib/features/leads/presentation/widgets/lead_delete_sheet.dart */
export const DeleteLeadLocators = {
  title: by.a11y("Confirm lead deletion"),
  deleteOnly: by.clickableContains("Delete only"),
  confirm: by.clickable("Confirm"),
  savedSnackbar: by.a11yContains("delet"),
} as const;
