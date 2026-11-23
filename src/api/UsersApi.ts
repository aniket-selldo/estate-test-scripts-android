import { settings } from "../config/environment.ts";
import { HttpClient } from "./HttpClient.ts";

/**
 * Role filters accepted by `Client::UsersController#index` (`search_params[role]` + `search_params[department]`).
 * Mirrors `UserRoleFilter` in the Playwright suite (CRMAPIUtils.getFirstActiveUserSummary).
 */
export const UserRole = {
  Sales: { role: "sales", department: "sales" },
  PreSales: { role: "pre_sales", department: "pre_sales" },
  SalesManager: { role: "manager", department: "sales" },
  Admin: { role: "admin", department: "" },
} as const;
export type UserRoleFilter = (typeof UserRole)[keyof typeof UserRole];

export interface SellDoUser {
  _id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role: string;
  department?: string;
  is_active: boolean;
  team_id?: string;
}

interface UsersListResponse {
  results: SellDoUser[];
  total?: number;
}

export class UsersApi {
  private readonly http = new HttpClient(settings.apiBaseUrl);

  /** `GET /client/users.json` - the Users listing page, filtered to active users of one role. */
  async listActiveUsers(filter: UserRoleFilter): Promise<SellDoUser[]> {
    const { body } = await this.http.get<UsersListResponse>("/client/users.json", {
      query: {
        api_key: settings.credentials.fullAccessApiKey,
        client_id: settings.credentials.clientId,
        "search_params[role]": filter.role,
        "search_params[department]": filter.department,
        "search_params[status]": "true",
        "search_params[search_string]": "",
        "search_params[team_id]": "",
      },
    });
    const results = Array.isArray(body.results) ? body.results : [];
    return results.filter((u) => u.is_active === true && u.role === filter.role);
  }

  /** Every active user of one role, across pages. */
  async listAllActiveUsers(filter: UserRoleFilter): Promise<SellDoUser[]> {
    const seen = new Set<string>();
    const all: SellDoUser[] = [];
    for (let page = 1; page <= 30; page++) {
      const { body } = await this.http.get<UsersListResponse>("/client/users.json", {
        query: {
          api_key: settings.credentials.fullAccessApiKey,
          client_id: settings.credentials.clientId,
          "search_params[role]": filter.role,
          "search_params[department]": filter.department,
          "search_params[status]": "true",
          "search_params[search_string]": "",
          "search_params[team_id]": "",
          page,
          per_page: 50,
        },
      });
      const results = (Array.isArray(body.results) ? body.results : []).filter((user) => user.is_active === true && user.role === filter.role);
      const fresh = results.filter((user) => user._id && !seen.has(user._id));
      if (fresh.length === 0) break;
      for (const user of fresh) {
        seen.add(user._id);
        all.push(user);
      }
      if (body.total != null && all.length >= body.total) break;
    }
    return all;
  }

  async firstActiveUser(filter: UserRoleFilter): Promise<SellDoUser> {
    const users = await this.listActiveUsers(filter);
    if (users.length === 0) {
      throw new Error(`No active "${filter.role}" user in client ${settings.credentials.clientId} on ${settings.apiBaseUrl}`);
    }
    return users[0];
  }

  /** The user id from `retrieve_lead` `sales_details.id`, among users who can sign in on mobile. */
  async userById(id: string): Promise<SellDoUser> {
    for (const filter of [UserRole.Sales, UserRole.PreSales, UserRole.Admin]) {
      const found = (await this.listAllActiveUsers(filter)).find((user) => user._id === id);
      if (found) return found;
    }
    throw new Error(`No active sales, pre-sales or admin user with id ${id}`);
  }

  /** The next active user of this role, skipping `exceptId` (the lead's current owner). */
  async anotherActiveUser(filter: UserRoleFilter, exceptId: string): Promise<SellDoUser> {
    const users = await this.listActiveUsers(filter);
    const other = users.find((user) => user._id !== exceptId);
    if (!other) {
      throw new Error(`No second active "${filter.role}" user besides ${exceptId} on ${settings.apiBaseUrl}`);
    }
    return other;
  }
}
