import { faker } from "@faker-js/faker";

export interface LeadData {
  firstName: string;
  lastName: string;
  /** Lower-case, unique per run. */
  email: string;
  /** 10-digit Indian mobile number (form default country code is +91). */
  phone: string;
}

/** Letters only: the lead APIs strip non-alphanumerics from names, which would break equality checks. */
function lettersOnly(value: string): string {
  return value.replace(/[^a-zA-Z]/g, "") || "Lead";
}

export const LeadFactory = {
  /**
   * A fresh lead identity. The run tag in the email/last name keeps every lead unique and
   * traceable back to the run that created it.
   */
  build(overrides: Partial<LeadData> = {}): LeadData {
    const tag = `${Date.now().toString(36)}${faker.string.alphanumeric({ length: 4, casing: "lower" })}`;
    const firstName = lettersOnly(faker.person.firstName());
    const lastName = lettersOnly(faker.person.lastName());
    return {
      firstName,
      lastName,
      email: `appium.${firstName}.${tag}@example.com`.toLowerCase(),
      // India mobile numbers start with 6-9 (same rule as the Playwright suite).
      phone: faker.helpers.arrayElement(["6", "7", "8", "9"]) + faker.string.numeric({ length: 9 }),
      ...overrides,
    };
  },
};
