import { Locator, Page } from '@playwright/test';
import { HealerAgent, HealingEvent, HealMode, HealOutcome, healMode } from '../agents/HealerAgent';

/**
 * HealingLocator — runs page actions by selector and, in HEAL_MODE=apply, heals
 * a failed action in the same session:
 *
 *  1. the action fails with the original selector
 *  2. the Healer suggests a replacement from the current page HTML
 *  3. if the top suggestion matches exactly one element, the action is retried with it
 *  4. the outcome is saved to reports/healing-events.json
 *
 * In suggest mode (the default) it only runs the action; failures are analysed
 * later by the After hook, as before. TodoPage routes its actions through here.
 */
export class HealingLocator {
  private readonly events: HealingEvent[] = [];

  constructor(
    private readonly page: Page,
    private readonly healer?: HealerAgent,
    private readonly mode: HealMode = healMode()
  ) {}

  click(selector: string): Promise<void> {
    return this.run(selector, 'click', (l) => l.click());
  }

  dblclick(selector: string): Promise<void> {
    return this.run(selector, 'dblclick', (l) => l.dblclick());
  }

  hover(selector: string): Promise<void> {
    return this.run(selector, 'hover', (l) => l.hover());
  }

  fill(selector: string, value: string): Promise<void> {
    return this.run(selector, 'fill', (l) => l.fill(value));
  }

  press(selector: string, key: string): Promise<void> {
    return this.run(selector, 'press', (l) => l.press(key));
  }

  async getText(selector: string): Promise<string> {
    return this.run(selector, 'textContent', async (l) => (await l.textContent()) ?? '');
  }

  isVisible(selector: string): Promise<boolean> {
    return this.run(selector, 'isVisible', (l) => l.isVisible());
  }

  /** Healing attempts made through this locator (apply mode only). */
  getHealingLog(): HealingEvent[] {
    return [...this.events];
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private async run<T>(selector: string, action: string, fn: (locator: Locator) => Promise<T>): Promise<T> {
    if (this.mode === 'suggest' || !this.healer) {
      return fn(this.page.locator(selector));
    }

    try {
      return await fn(this.page.locator(selector));
    } catch (originalError) {
      console.warn(`[HealingLocator] "${selector}" failed on ${action} — asking the Healer`);

      const response = await this.healer.analyzeFailure({
        scenarioName: `${action}("${selector}")`,
        errorMessage: originalError instanceof Error ? originalError.message : String(originalError),
        pageHtml: await this.page.content(),
        pageUrl: this.page.url(),
      });

      const suggested = response.suggestions[0]?.suggestedSelector;
      const matches = await this.countMatches(suggested);

      let outcome: HealOutcome;
      let result: T | undefined;
      if (matches === null) {
        outcome = 'invalid_suggestion';
      } else if (matches !== 1) {
        outcome = 'not_healed';
      } else {
        try {
          result = await fn(this.page.locator(suggested!));
          outcome = 'healed';
        } catch {
          outcome = 'not_healed';
        }
      }

      const event: HealingEvent = {
        ...response,
        mode: 'apply',
        outcome,
        originalSelector: selector,
        appliedSelector: suggested,
      };
      this.events.push(event);
      this.healer.saveHealingEvent(event);
      console.log(`[HealingLocator] ${outcome}: "${selector}" → "${suggested ?? 'none'}"`);

      if (outcome !== 'healed') throw originalError;
      return result as T;
    }
  }

  /** Element count for a selector, or null when there is no selector or its syntax is invalid. */
  private async countMatches(selector: string | undefined): Promise<number | null> {
    if (!selector || selector === 'PARSE_ERROR') return null;
    try {
      return await this.page.locator(selector).count();
    } catch {
      return null;
    }
  }
}
