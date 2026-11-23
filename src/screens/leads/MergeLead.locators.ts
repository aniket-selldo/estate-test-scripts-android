import { by } from "../../core/locators.ts";

/** lib/features/leads/presentation/screens/lead_merge_screen.dart */
export const MergeLeadLocators = {
  title: by.a11y("Merge lead"),
  leadToMerge: by.formField("Lead to merge"),
  notes: by.textField("Notes"),
  merge: by.clickable("Merge"),
  savedSnackbar: by.a11yContains("Lead merge is scheduled successfully"),
} as const;
