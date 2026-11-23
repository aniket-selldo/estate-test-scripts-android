import { BaseScreen } from "../../core/BaseScreen.ts";
import { step } from "../../core/reporting.ts";
import { MaterialDateTimeDialog } from "../components/MaterialDateTime.screen.ts";
import { UpdateSiteVisitLocators as L } from "./UpdateSiteVisit.locators.ts";

const SAVE_TIMEOUT_MS = 30_000;

export interface UpdateOutcome {
  formClosed: boolean;
  errors: string[];
  successMessage: string;
}

/** The update form opened from a site visit action. `opened` is a locator only that form has. */
export class UpdateSiteVisitScreen extends BaseScreen {
  protected readonly trait: string;
  protected readonly isModal = false;

  constructor(
    private readonly action: string,
    opened: string,
  ) {
    super();
    this.trait = opened;
  }

  protected get name(): string {
    return this.action;
  }

  /** "Mark as conducted": notes are required and the time must be in the past. */
  async markConducted(conductedAt: Date, notes: string): Promise<UpdateOutcome> {
    return step("Mark the site visit as conducted", async () => {
      await this.scrollTo(L.conductedOn);
      await this.tap(L.conductedOn);
      await new MaterialDateTimeDialog().pick(conductedAt);
      await this.type(L.notes, notes);
      return this.confirm();
    });
  }

  /** "Mark not interested" needs nothing else; the app sends status `dropped`. */
  async markNotInterested(): Promise<UpdateOutcome> {
    return step("Mark the site visit as not interested", () => this.confirm());
  }

  /** "Reschedule": a new start time in the future. The status stays `scheduled`. */
  async reschedule(when: Date): Promise<UpdateOutcome> {
    return step(`Reschedule the site visit to ${when.toLocaleString("en-IN")}`, async () => {
      await this.scrollTo(L.rescheduleOn);
      await this.tap(L.rescheduleOn);
      await new MaterialDateTimeDialog().pick(when);
      return this.confirm();
    });
  }

  private async confirm(): Promise<UpdateOutcome> {
    const before = new Set(await this.visibleLabels());
    const appeared = new Set<string>();
    await this.tap(L.action(this.action));
    const deadline = Date.now() + SAVE_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (!(await this.isShown())) {
        const success = [...appeared].find((label) => /success/i.test(label)) ?? "";
        return { formClosed: true, errors: [], successMessage: success };
      }
      for (const label of await this.visibleLabels()) {
        if (!before.has(label)) appeared.add(label);
      }
    }
    return { formClosed: false, errors: [...appeared], successMessage: "" };
  }
}
