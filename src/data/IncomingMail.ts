import { EmailsApi } from "../api/EmailsApi.ts";
import { LeadsApi } from "../api/LeadsApi.ts";
import { UsersApi, type SellDoUser } from "../api/UsersApi.ts";
import { step } from "../core/reporting.ts";
import { ClientConfigData } from "./ClientConfigData.ts";
import { LeadFactory, type LeadData } from "./LeadFactory.ts";

/** A lead created by one incoming email, plus the copy that email carried. */
export interface IncomingMailLead {
  lead: LeadData;
  leadId: string;
  owner: SellDoUser;
  subject: string;
  body: string;
  /** Copied onto the email as toCC. Reply leaves it off. Reply all keeps it. */
  cc: string;
}

/**
 * Delivers one email to a campaign mailbox. The observer creates the lead and
 * assigns an owner. `cc` is a second address so Reply all has someone to copy.
 */
export async function createLeadFromIncomingMail(): Promise<IncomingMailLead> {
  const mailbox = await step("API: pick a campaign email address", () => ClientConfigData.campaignMailbox());
  const lead = LeadFactory.build();
  const subject = `Appium incoming ${lead.lastName}`;
  const body = `Appium incoming body ${lead.lastName}`;
  const cc = `appium.cc.${lead.lastName.toLowerCase()}@example.com`;
  await step("API: deliver the email to that campaign mailbox", () =>
    new EmailsApi().receive({
      recipient: mailbox.text,
      fromEmail: lead.email,
      fromName: `${lead.firstName} ${lead.lastName}`,
      subject,
      body,
      cc,
    }),
  );
  const saved = await step("API: retrieve the lead created from the sender", () => new LeadsApi().retrieveWhenExists(lead.email));
  const leadId = saved.lead?.id ?? "";
  const ownerId = saved.sales_details?.id ?? "";
  if (!leadId || !ownerId) throw new Error("Incoming mail did not create a lead with an owner");
  const owner = await step("API: get the user the email was routed to", () => new UsersApi().userById(ownerId));
  return { lead, leadId, owner, subject, body, cc };
}
