import { by } from "../../core/locators.ts";

/** Flutter `showDatePicker` / `showTimePicker` (Material), opened by `AppFormField.dateTime`. */
export const MaterialDateTimeLocators = {
  nextMonth: by.a11y("Next month"),
  previousMonth: by.a11y("Previous month"),
  ok: by.clickable("OK"),
  switchToTextInput: by.a11y("Switch to text input mode"),
  hour: by.textField("Hour"),
  minute: by.textField("Minute"),
  am: by.clickable("AM"),
  pm: by.clickable("PM"),
} as const;
