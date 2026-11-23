import { step } from "../core/reporting.ts";
import { HomeScreen } from "../screens/home/Home.screen.ts";
import { LeadBulkReassignSheet } from "../screens/leads/LeadBulkReassign.screen.ts";
import { LeadBulkStageSheet } from "../screens/leads/LeadBulkStage.screen.ts";
import { LeadDetailScreen } from "../screens/leads/LeadDetail.screen.ts";
import type { SaveOutcome } from "../screens/components/formSave.ts";

/** Global search by email or phone, then the lead's conversation page. */
export async function findLead(query: string, leadName: string): Promise<LeadDetailScreen> {
  return step(`Find "${leadName}" through global search`, async () => {
    const leads = await new HomeScreen().openLeads();
    await leads.search(query);
    return new LeadDetailScreen().openFromList(leadName);
  });
}

export interface BulkStageRun {
  /** Labels on the filtered list, including the result count. */
  listText: string;
  /** The selection bar, e.g. "5 selected". */
  selectedText: string;
  outcome: SaveOutcome;
}

/**
 * Search isolates the leads created for this run, Select all takes that set,
 * and Change stage applies one pipeline stage that is not incoming.
 */
export async function searchAndBulkChangeStage(input: {
  query: string;
  names: string[];
  pipeline: string;
  stage: string;
  status: string;
  reason: string;
}): Promise<BulkStageRun> {
  return step(`Bulk change ${input.names.length} searched leads to "${input.stage}"`, async () => {
    const leads = await new HomeScreen().openLeads();
    await leads.search(input.query);
    const listText = await leads.waitForSearchResults(input.names, input.names.length);
    await leads.openBulkStage();
    const selectedText = await leads.selectAllAndChangeStage(input.names.length);
    const sheet = await new LeadBulkStageSheet().waitUntilShown();
    const outcome = await sheet.changeTo(input.pipeline, input.stage, input.status, input.reason);
    return { listText, selectedText, outcome };
  });
}

/**
 * Search isolates the leads created for this run, Select all takes that set,
 * and Simple reassignment sends every lead to one other person.
 */
export async function searchAndBulkReassign(input: {
  query: string;
  names: string[];
  strategy: "team" | "project";
  group: string;
  user: string;
}): Promise<BulkStageRun> {
  return step(`Bulk reassign ${input.names.length} searched leads to "${input.user}"`, async () => {
    const leads = await new HomeScreen().openLeads();
    await leads.search(input.query);
    const listText = await leads.waitForSearchResults(input.names, input.names.length);
    await leads.openBulkReassign();
    const selectedText = await leads.selectAllAndReassign(input.names.length);
    const sheet = await new LeadBulkReassignSheet().waitUntilShown();
    const outcome = await sheet.reassign({
      strategy: input.strategy,
      group: input.group,
      user: input.user,
    });
    return { listText, selectedText, outcome };
  });
}
