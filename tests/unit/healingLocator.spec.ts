import { test, expect } from '@playwright/test';
import { HealerAgent, HealingEvent } from '../../src/agents/HealerAgent';
import { AIProvider, HealingRequest, HealingResponse } from '../../src/agents/providers/AIProvider';
import { HealingLocator } from '../../src/utils/HealingLocator';

/** Always suggests the same selector. */
class StubProvider implements AIProvider {
  readonly providerName = 'Stub';
  calls = 0;
  constructor(private readonly selector: string) {}

  async complete(): Promise<string> {
    return '';
  }

  async analyzeFailure(request: HealingRequest): Promise<HealingResponse> {
    this.calls++;
    return {
      scenarioName: request.scenarioName,
      errorMessage: request.errorMessage,
      pageUrl: request.pageUrl,
      suggestions: [{ suggestedSelector: this.selector, confidence: 'high', reasoning: 'stub' }],
      timestamp: new Date().toISOString(),
      provider: this.providerName,
    };
  }
}

/** Keeps unit tests from writing reports/healing-events.json. */
class InMemoryHealer extends HealerAgent {
  saved: HealingEvent[] = [];
  saveHealingEvent(event: HealingEvent): void {
    this.saved.push(event);
  }
}

test.beforeEach(async ({ page }) => {
  page.setDefaultTimeout(500);
  await page.setContent(`
    <button class="save-btn" onclick="document.title = 'saved'">Save</button>
    <li class="row">a</li><li class="row">b</li>
  `);
});

test('apply mode retries with a suggestion that matches one element', async ({ page }) => {
  const healer = new InMemoryHealer(new StubProvider('.save-btn'));
  const healing = new HealingLocator(page, healer, 'apply');

  await healing.click('.save');

  expect(await page.title()).toBe('saved');
  expect(healer.saved[0]).toMatchObject({ mode: 'apply', outcome: 'healed', originalSelector: '.save', appliedSelector: '.save-btn' });
  expect(healing.getHealingLog()).toHaveLength(1);
});

test('apply mode records an invalid suggestion and rethrows the original error', async ({ page }) => {
  for (const bad of ['PARSE_ERROR', 'div[[[']) {
    const healer = new InMemoryHealer(new StubProvider(bad));
    await expect(new HealingLocator(page, healer, 'apply').click('.save')).rejects.toThrow('.save');
    expect(healer.saved[0].outcome).toBe('invalid_suggestion');
  }
});

test('apply mode does not act on a suggestion that matches several elements', async ({ page }) => {
  const healer = new InMemoryHealer(new StubProvider('.row'));
  await expect(new HealingLocator(page, healer, 'apply').click('.save')).rejects.toThrow();
  expect(healer.saved[0].outcome).toBe('not_healed');
});

test('suggest mode leaves the failure to the After hook', async ({ page }) => {
  const provider = new StubProvider('.save-btn');
  const healing = new HealingLocator(page, new InMemoryHealer(provider), 'suggest');

  await expect(healing.click('.save')).rejects.toThrow();
  expect(provider.calls).toBe(0);
  expect(healing.getHealingLog()).toHaveLength(0);
});
