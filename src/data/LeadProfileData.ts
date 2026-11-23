import { LeadProfileApi, type Choice } from "../api/LeadProfileApi.ts";
import { UserRole, UsersApi, type SellDoUser } from "../api/UsersApi.ts";

export interface ReassignTarget {
  group: Choice;
  /** Sales user we can sign in as with the shared password. */
  user: SellDoUser;
  /** Label the reassign user picker shows. */
  userLabel: string;
  /** Set when the form requires a reassignment reason. */
  reason: Choice | undefined;
}

/**
 * Someone other than the owner the reassign form can actually select.
 * With hierarchy on, a sales user's team field is locked to their own team
 * (`leadReassignTeamLocked` in lead_reassign.dart), so the team case stays on that team.
 */
export async function reassignTarget(
  profile: LeadProfileApi,
  strategy: "team" | "project",
  owner: SellDoUser,
): Promise<ReassignTarget> {
  const sales = await new UsersApi().listAllActiveUsers(UserRole.Sales);
  const byId = new Map(sales.map((user) => [user._id, user]));
  const reasons = await profile.reassignmentReasons();
  const reason = reasons[0];
  if (strategy === "team" && owner.team_id) {
    const groups = await profile.groups("teams");
    const group = groups.find((item) => item.id === owner.team_id);
    if (!group) throw new Error(`Owner team ${owner.team_id} is not in the team lookup`);
    const target = await otherSalesUser(profile, "team", group, owner._id, byId);
    if (!target) throw new Error(`Team "${group.text}" has no other active sales user to reassign to`);
    return { group, reason, ...target };
  }
  const groups = await profile.groups(strategy === "project" ? "projects" : "teams");
  for (const group of groups) {
    const target = await otherSalesUser(profile, strategy, group, owner._id, byId);
    if (target) return { group, reason, ...target };
  }
  throw new Error(`No ${strategy} has another active sales user who can take this lead`);
}

/** A sales team or project the push form lists, and a sales person when the form asks for one. */
export async function pushTarget(
  profile: LeadProfileApi,
  byProject: boolean,
  preferredGroupId: string,
): Promise<{ group: Choice; user: Choice | undefined }> {
  const groups = await profile.groups(byProject ? "projects" : "teams", byProject ? {} : { department: "sales" });
  const ordered = [
    ...groups.filter((group) => group.id === preferredGroupId),
    ...groups.filter((group) => group.id !== preferredGroupId),
  ];
  let fallback: Choice | undefined;
  for (const group of ordered) {
    fallback ??= group;
    const people = await profile.pushUsers(byProject, group.id);
    if (people.length > 0) return { group, user: people[0] };
  }
  if (fallback) return { group: fallback, user: undefined };
  throw new Error(`No ${byProject ? "project" : "sales team"} is available for Push to sales`);
}

async function otherSalesUser(
  profile: LeadProfileApi,
  strategy: "team" | "project",
  group: Choice,
  ownerId: string,
  salesById: Map<string, SellDoUser>,
): Promise<{ user: SellDoUser; userLabel: string } | undefined> {
  const choices = await profile.reassignUsers(strategy, group.id);
  for (const choice of choices) {
    const user = salesById.get(choice.id);
    if (user && user._id !== ownerId) return { user, userLabel: choice.text };
  }
  return undefined;
}
