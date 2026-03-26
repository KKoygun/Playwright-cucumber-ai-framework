/* eslint-disable @typescript-eslint/no-require-imports */
const reporter = require('multiple-cucumber-html-reporter');
const path = require('path');
const fs = require('fs');

const reportsDir = path.join(__dirname, '..', 'reports');
const htmlDir = path.join(reportsDir, 'html');

// Ensure the reports directory exists
if (!fs.existsSync(reportsDir)) {
  console.log('No reports directory found. Run tests first with: npm test');
  process.exit(0);
}

// Check for JSON reports
const jsonFiles = fs
  .readdirSync(reportsDir)
  .filter((f) => f.endsWith('.json') && f !== 'healing-events.json');

if (jsonFiles.length === 0) {
  console.log('No JSON report files found in reports/. Run tests first with: npm test');
  process.exit(0);
}

console.log(`Generating HTML report from ${jsonFiles.length} JSON file(s)...`);

reporter.generate({
  jsonDir: reportsDir,
  reportPath: htmlDir,
  reportName: 'Playwright + Cucumber + AI Healer — Test Report',
  pageTitle: 'Test Execution Report',
  metadata: {
    browser: { name: 'Chromium', version: 'latest' },
    device: 'Desktop',
    platform: { name: process.platform },
  },
  customData: {
    title: 'Run Info',
    data: [
      { label: 'Project', value: 'playwright-cucumber-ai-portfolio' },
      { label: 'Target', value: 'https://demo.playwright.dev/todomvc' },
      { label: 'Generated', value: new Date().toISOString() },
    ],
  },
});

console.log('Report generated at:', htmlDir);

// Print healing summary if events exist
const eventsPath = path.join(reportsDir, 'healing-events.json');
if (fs.existsSync(eventsPath)) {
  const events = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));
  if (events.length > 0) {
    console.log(`\n[Healer] ${events.length} healing event(s) captured — see reports/healing-events.json`);
  }
}
