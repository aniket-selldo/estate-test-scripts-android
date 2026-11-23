import { settings } from "../config/environment.ts";
import { HttpClient } from "./HttpClient.ts";
import { SessionApi } from "./SessionApi.ts";
import { UserRole, UsersApi } from "./UsersApi.ts";
import { readValue, v3Headers } from "./v3Auth.ts";

/** `{ id, text }` row returned by sell.do data providers; `text` is the label the app shows. */
export interface ProviderOption {
  id: string;
  text: string;
}

interface ApiClient {
  api_key: string;
  category: string;
  api_client_type?: string;
  created_at: string;
}

/**
 * Client configuration read at runtime with the full-access key, so tests never store
 * campaign names, stages or secondary API keys.
 */
export class ClientConfigApi {
  private readonly http = new HttpClient(settings.apiBaseUrl);
  private readonly auth = {
    api_key: settings.credentials.fullAccessApiKey,
    client_id: settings.credentials.clientId,
  };

  /** `GET /client/campaigns/data_provider.json` (Client::CampaignsController#data_provider). */
  async campaigns(): Promise<ProviderOption[]> {
    return this.provider("/client/campaigns/data_provider.json");
  }

  /** `GET /client/projects/data_provider.json` (Client::ProjectsController#data_provider). */
  async projects(): Promise<ProviderOption[]> {
    return this.provider("/client/projects/data_provider.json");
  }

  /** `GET /client/configuration/ds/site_visit_type.json`. */
  async siteVisitTypes(): Promise<ProviderOption[]> {
    return this.provider("/client/configuration/ds/site_visit_type.json");
  }

  /** `GET /client/configuration/data_provider_sales_stage.json` (Client::ConfigurationController#data_provider_sales_stage). */
  async salesStages(): Promise<ProviderOption[]> {
    return this.provider("/client/configuration/data_provider_sales_stage.json");
  }

  /** `GET /client/configuration/data_provider_presales_stage.json` (Client::ConfigurationController#data_provider_presales_stage). */
  async presalesStages(): Promise<ProviderOption[]> {
    return this.provider("/client/configuration/data_provider_presales_stage.json");
  }

  /**
   * `GET /api/v3/client/client_configuration` (Api::V3::Client::ClientConfigurationsController#show).
   * `reassign_lead_strategy` is `team` or `project`.
   */
  async reassignStrategy(accessToken: string): Promise<"team" | "project"> {
    const value = await this.configurationValue(accessToken, "/api/v3/client/client_configuration", "reassign_lead_strategy");
    return value === "project" ? "project" : "team";
  }

  /**
   * `PATCH /api/v3/client/client_configuration` (Api::V3::Client::ClientConfigurationsController#update).
   * Only the sent key changes. Restore the previous value after the test.
   */
  async setReassignStrategy(accessToken: string, strategy: "team" | "project"): Promise<void> {
    await this.v3().patch("/api/v3/client/client_configuration", {
      headers: v3Headers(accessToken),
      json: { values: { reassign_lead_strategy: strategy } },
    });
  }

  /**
   * `GET /api/v3/client/pre_sales_configuration` (Api::V3::Client::PreSalesConfigurationsController#show).
   * `push_lead_strategy` `project` makes Push to sales pick a project; any other value picks a team.
   * `auto_forward` assigns the sales person, so the form hides that field and rejects a manual id.
   */
  async pushSettings(accessToken: string): Promise<{ byProject: boolean; autoForward: boolean }> {
    try {
      return await this.readPushSettings(accessToken);
    } catch (error) {
      // A pre-sales user can open the form, but this endpoint answers 403. An admin can read the same client setting.
      if (!String(error).includes("403")) throw error;
      const admin = await new UsersApi().firstActiveUser(UserRole.Admin);
      const adminToken = await new SessionApi().accessToken(admin.email, settings.credentials.userPassword);
      return this.readPushSettings(adminToken);
    }
  }

  private async readPushSettings(accessToken: string): Promise<{ byProject: boolean; autoForward: boolean }> {
    const { body } = await this.v3().get<unknown>("/api/v3/client/pre_sales_configuration", {
      headers: v3Headers(accessToken),
    });
    return {
      byProject: readValue(body, "push_lead_strategy") === "project",
      autoForward: readValue(body, "auto_forward") === "true" || readValue(body, "auto_forward") === "1",
    };
  }

  private v3(): HttpClient {
    return new HttpClient(settings.v3ApiBaseUrl);
  }

  private async configurationValue(accessToken: string, path: string, key: string): Promise<string> {
    const { body } = await this.v3().get<unknown>(path, { headers: v3Headers(accessToken) });
    const value = readValue(body, key);
    if (!value) throw new Error(`${path} has no ${key}`);
    return value;
  }

  /**
   * `GET /client/api_clients.json` (Client::ApiClientsController#index, 15 per page): the
   * client's original website integration - the oldest restricted client of type "website".
   * Other restricted types (housing_pusher, facebook_puller, ...) are accepted by
   * `POST /api/leads/create` but do not create a lead.
   */
  async websiteApiKey(): Promise<string> {
    const clients: ApiClient[] = [];
    for (let page = 1; ; page++) {
      const { body } = await this.http.get<{ results?: ApiClient[]; total?: number }>("/client/api_clients.json", {
        query: { ...this.auth, page },
      });
      const results = body.results ?? [];
      clients.push(...results);
      if (results.length === 0 || clients.length >= (body.total ?? 0)) break;
    }
    const website = clients
      .filter((c) => c.category === "restricted" && c.api_client_type === "website" && c.api_key)
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    if (website.length === 0) throw new Error(`Client ${settings.credentials.clientId} has no website API client`);
    return website[0].api_key;
  }

  private async provider(path: string): Promise<ProviderOption[]> {
    const { body } = await this.http.get<ProviderOption[]>(path, { query: this.auth });
    if (!Array.isArray(body) || body.length === 0) throw new Error(`${path} returned no options`);
    return body;
  }
}
