import { step } from "../core/reporting.ts";
import { HomeScreen } from "../screens/home/Home.screen.ts";
import { LeadDetailScreen } from "../screens/leads/LeadDetail.screen.ts";

/** Global search by email or phone, then the lead's conversation page. */
export async function findLead(query: string, leadName: string): Promise<LeadDetailScreen> {
  return step(`Find "${leadName}" through global search`, async () => {
    const leads = await new HomeScreen().openLeads();
    await leads.search(query);
    return new LeadDetailScreen().openFromList(leadName);
  });
}
