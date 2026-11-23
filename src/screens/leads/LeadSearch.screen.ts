import { BaseScreen } from "../../core/BaseScreen.ts";
import { LeadSearchLocators as L } from "./LeadSearch.locators.ts";

export class LeadSearchSheet extends BaseScreen {
  protected readonly name = "Lead search";
  protected readonly trait = L.title;
  protected readonly isModal = true;

  async submit(query: string): Promise<void> {
    await this.waitUntilShown();
    await this.type(L.query, query);
    await this.tap(L.search);
    await this.waitUntilGone();
  }
}
