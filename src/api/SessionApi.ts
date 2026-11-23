import { settings } from "../config/environment.ts";
import { HttpClient } from "./HttpClient.ts";

interface LoginResponse {
  access_token?: string;
  error?: string;
}

/**
 * `POST /api/v3/users/login` (Api::V3::Users::SessionsController#create).
 * The token authorises the v3 lead and site visit calls the app makes.
 */
export class SessionApi {
  private readonly http = new HttpClient(settings.v3ApiBaseUrl);

  async accessToken(email: string, password: string): Promise<string> {
    const { body } = await this.http.post<LoginResponse>("/api/v3/users/login", {
      json: { email, password, platform: "android" },
    });
    if (!body.access_token) throw new Error(`v3 login failed for ${email}: ${body.error ?? "no access token"}`);
    return body.access_token;
  }
}
