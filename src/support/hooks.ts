import { Before, After, AfterAll, Status } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://demo.playwright.dev/todomvc';

// ── UI Tests (everything except @api) ──────────────────────────────────────

Before({ tags: 'not @api' }, async function (this: CustomWorld) {
  await this.init();
  await this.page.goto(BASE_URL);
});

After({ tags: 'not @api' }, async function (this: CustomWorld, scenario) {
  if (scenario.result?.status === Status.FAILED) {
    // 1. Attach screenshot to the Cucumber report
    const screenshot = await this.page.screenshot({ fullPage: true });
    await this.attach(screenshot, 'image/png');

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

      this.healer.saveHealingEvent(healingReport);
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
