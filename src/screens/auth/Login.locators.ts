import { by, xpathLiteral } from "../../core/locators.ts";

/**
 * lib/features/auth/presentation/widgets/login_form.dart + password_field.dart
 * Android autofill can fill both boxes before the test types. A filled field drops its hint,
 * so the email box is also matched by the address in its text, and the password box by password="true".
 */
const emailHint = xpathLiteral("name@example.com");
const passwordHint = xpathLiteral("Enter password");

export const LoginLocators = {
  email: `//android.widget.EditText[@hint=${emailHint} or starts-with(@hint, ${xpathLiteral("name@example.com *")}) or contains(@text, "@")]`,
  password: `//android.widget.EditText[@hint=${passwordHint} or starts-with(@hint, ${xpathLiteral("Enter password *")}) or @password="true"]`,
  signIn: by.a11y("Sign in"), // button text
} as const;
