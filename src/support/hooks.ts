import { Before, After, AfterAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import { healMode } from '../agents/HealerAgent';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://demo.playwright.dev/todomvc';

// Apply mode calls the model inside a step, which does not fit Cucumber's default 5s
if (healMode() === 'apply') setDefaultTimeout(60_000);

// ── UI Tests (everything except @api) ──────────────────────────────────────

Before({ tags: 'not @api' }, async function (this: CustomWorld) {
  await this.init();
  await this.page.goto(BASE_URL);
});

After({ tags: 'not @api' }, async function (this: CustomWorld, scenario) {
  // Apply mode: healing already happened inside the steps, whether it worked or not
  const inlineEvents = this.healing.getHealingLog();
  for (const event of inlineEvents) {
    await this.attach(JSON.stringify(event, null, 2), 'application/json');
  }

  if (scenario.result?.status === Status.FAILED) {
    // 1. Attach screenshot to the Cucumber report
    const screenshot = await this.page.screenshot({ fullPage: true });
    await this.attach(screenshot, 'image/png');
  }

  if (scenario.result?.status === Status.FAILED && inlineEvents.length === 0) {
    const errorMessage = scenario.result.message ?? 'Unknown error';
    const pageHtml = await this.page.content();

    // 2. Run the Healer agent and attach its suggestions to the report
    try {
      const healingReport = await this.healer.analyzeFailure({
        scenarioName: scenario.pickle.name,
        errorMessage,
        pageHtml,
        pageUrl: this.page.url(),
      });

      await this.attach(
        JSON.stringify(healingReport, null, 2),
        'application/json'
      );

      this.healer.saveHealingEvent({ ...healingReport, mode: 'suggest' });
    } catch (healerError) {
      // Healer failure should never block the test report
      console.warn('[Healer] Agent call failed:', healerError);
    }
  }

  await this.cleanup();
});

// ── API Tests (@api) ───────────────────────────────────────────────────────

Before({ tags: '@api' }, async function (this: CustomWorld) {
  await this.initApi();
});

After({ tags: '@api' }, async function (this: CustomWorld) {
  await this.cleanupApi();
});

// ── AfterAll ───────────────────────────────────────────────────────────────

AfterAll(function () {
  const eventsPath = path.join('reports', 'healing-events.json');

  if (!fs.existsSync(eventsPath)) return;

  const events = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));

  if (events.length > 0) {
    console.log(
      `\n[Healer] ${events.length} healing suggestion(s) generated — see reports/healing-events.json`
    );
  }
});
