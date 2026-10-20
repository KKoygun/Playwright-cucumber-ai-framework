import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';
import { CustomWorld } from '../support/world';

const BASELINE_PATH = path.join('a11y', 'baseline.json');
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

type Baseline = Record<string, string[]>;

function readBaseline(): Baseline {
  return fs.existsSync(BASELINE_PATH) ? (JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8')) as Baseline) : {};
}

Then('the page should have no new accessibility violations', async function (this: CustomWorld) {
  const results = await new AxeBuilder({ page: this.page }).withTags(WCAG_TAGS).analyze();

  // One entry per rule and element, e.g. "color-contrast | .todo-count"
  const found = results.violations
    .flatMap((v) => v.nodes.map((n) => `${v.id} | ${n.target.join(' ')}`))
    .sort();

  const baseline = readBaseline();

  if (this.parameters.updateA11yBaseline) {
    baseline[this.scenarioName] = found;
    const sorted = Object.fromEntries(Object.entries(baseline).sort(([a], [b]) => a.localeCompare(b)));
    fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(sorted, null, 2) + '\n');
    return;
  }

  if (results.violations.length > 0) {
    await this.attach(JSON.stringify(results.violations, null, 2), 'application/json');
  }

  const known = baseline[this.scenarioName] ?? [];
  const fixed = known.filter((k) => !found.includes(k));
  if (fixed.length > 0) {
    console.log(`[a11y] No longer found, consider updating the baseline:\n  ${fixed.join('\n  ')}`);
  }

  const newViolations = found.filter((f) => !known.includes(f));
  expect(newViolations, `New accessibility violations (not in ${BASELINE_PATH}):\n${newViolations.join('\n')}`).toEqual([]);
});
