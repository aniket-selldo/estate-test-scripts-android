/** Value transforms the backend legitimately applies; use them on both sides of a comparison. */
export const normalize = {
  text: (value: string) => value.trim(),
  /** Emails and picker labels are matched case-insensitively by the backend and the app. */
  caseInsensitive: (value: string) => value.trim().toLowerCase(),
  /** National 10-digit form: retrieve_lead returns "9876543210" for +91 numbers. */
  phone: (value: string) => value.replace(/\D/g, "").slice(-10),
};
