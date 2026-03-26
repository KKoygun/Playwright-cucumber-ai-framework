import { Page } from '@playwright/test';
import { HealerAgent } from '../agents/HealerAgent';

interface HealingEvent {
  originalSelector: string;
  healedSelector: string;
  action: string;
  success: boolean;
  timestamp: string;
}

/**
 * HealingLocator — a Playwright locator wrapper with AI-powered self-healing.
 *
 * When a selector-based action fails, HealingLocator:
 *  1. Captures the current page HTML
 *  2. Calls the HealerAgent to get an alternative selector
 *  3. Retries the action with the top suggestion
 *  4. Logs whether the healed selector succeeded
 *
 * Usage in step definitions:
 *   const locator = new HealingLocator(this.page, this.healer);
 *   await locator.click('.some-selector');    // auto-heals on failure
 *
 * Design note: This is optional — step definitions can use TodoPage directly.
 * HealingLocator is used when you want inline healing rather than post-failure
 * analysis (e.g. during exploratory testing or on unstable environments).
 */
export class HealingLocator {
  private readonly healingLog: HealingEvent[] = [];

  constructor(
    private readonly page: Page,
    private readonly healer: HealerAgent
  ) {}

  async click(selector: string): Promise<void> {
    await this.withHealing(selector, 'click', async (s) => {
      await this.page.locator(s).click({ timeout: 5000 });
    });
  }

  async fill(selector: string, value: string): Promise<void> {
    await this.withHealing(selector, 'fill', async (s) => {
      await this.page.locator(s).fill(value);
    });
  }

  async getText(selector: string): Promise<string> {
    return this.withHealing(selector, 'textContent', async (s) => {
      return (await this.page.locator(s).textContent()) ?? '';
    });
  }

  async isVisible(selector: string): Promise<boolean> {
    return this.withHealing(selector, 'isVisible', async (s) => {
      return this.page.locator(s).isVisible();
    });
  }

  getHealingLog(): HealingEvent[] {
    return [...this.healingLog];
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private async withHealing<T>(
    selector: string,
    action: string,
    fn: (selector: string) => Promise<T>
  ): Promise<T> {
    try {
      return await fn(selector);
    } catch (originalError) {
      console.warn(`[HealingLocator] Selector failed: "${selector}" on "${action}" — calling Healer...`);

      const pageHtml = await this.page.content();
      const errorMessage =
        originalError instanceof Error ? originalError.message : String(originalError);

      const response = await this.healer.analyzeFailure({
        scenarioName: `HealingLocator.${action}("${selector}")`,
        errorMessage,
        pageHtml,
        pageUrl: this.page.url(),
      });

      const topSuggestion = response.suggestions[0];

      if (!topSuggestion || topSuggestion.suggestedSelector === 'PARSE_ERROR') {
        this.healingLog.push({
          originalSelector: selector,
          healedSelector: 'NONE',
          action,
          success: false,
          timestamp: new Date().toISOString(),
        });
        throw originalError;
      }

      console.log(`[HealingLocator] Retrying with: "${topSuggestion.suggestedSelector}"`);

      const result = await fn(topSuggestion.suggestedSelector);

      this.healingLog.push({
        originalSelector: selector,
        healedSelector: topSuggestion.suggestedSelector,
        action,
        success: true,
        timestamp: new Date().toISOString(),
      });

      return result;
    }
  }
}
