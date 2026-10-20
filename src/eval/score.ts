import { Page } from '@playwright/test';
import { HealOutcome } from '../agents/HealerAgent';
import { EvalCase } from './cases';

type EvalWindow = Window & { __evalTarget?: Element };

export interface PreparedCase {
  valid: boolean;
  note?: string;
  /** The real Playwright error for the broken selector, used as the Healer input. */
  errorMessage?: string;
}

/**
 * Remembers the element the original selector points at, applies the mutation and
 * checks that the original selector is now broken. The element is kept in a window
 * property, so nothing about it shows up in the HTML the Healer sees.
 */
export async function prepareCase(page: Page, evalCase: EvalCase): Promise<PreparedCase> {
  const original = page.locator(evalCase.selector);
  const before = await original.count();
  if (before !== 1) {
    return { valid: false, note: `original selector matched ${before} elements before the mutation` };
  }

  await original.evaluate((el) => {
    (window as EvalWindow).__evalTarget = el;
  });
  await original.evaluate(evalCase.mutate);

  const after = await page.locator(evalCase.selector).count();
  if (after !== 0) {
    return { valid: false, note: `mutation did not break the selector (${after} matches after)` };
  }

  const errorMessage = await page
    .locator(evalCase.selector)
    .waitFor({ state: 'attached', timeout: 1000 })
    .then(() => 'selector unexpectedly resolved')
    .catch((error: Error) => error.message.replace(/\x1b\[[0-9;]*m/g, ''));

  return { valid: true, errorMessage };
}

/** Success means the suggested selector finds exactly the element the original one found. */
export async function scoreSelector(page: Page, selector: string | undefined): Promise<HealOutcome> {
  if (!selector || selector === 'PARSE_ERROR') return 'invalid_suggestion';
  try {
    const sameElement = await page
      .locator(selector)
      .evaluateAll((els) => els.length === 1 && els[0] === (window as EvalWindow).__evalTarget);
    return sameElement ? 'healed' : 'not_healed';
  } catch {
    return 'invalid_suggestion';
  }
}
