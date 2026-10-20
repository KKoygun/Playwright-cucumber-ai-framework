import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PlannerAgent } from '../src/agents/PlannerAgent';
import { createProvider } from '../src/agents/providers/createProvider';
import { StepParser } from '../src/utils/StepParser';

dotenv.config();

/**
 * plan.ts — CLI script to generate a .feature file from a requirements .md file.
 *
 * Usage:
 *   npm run plan                                      (uses default requirements file)
 *   npm run plan -- requirements/todo-editing.md      (specify a file)
 *
 * Output: src/features/<derived-name>.feature
 */
async function main(): Promise<void> {
  const requirementsPath = process.argv[2] ?? 'requirements/todo-editing.md';

  if (!fs.existsSync(requirementsPath)) {
    console.error(`[Planner] File not found: ${requirementsPath}`);
    process.exit(1);
  }

  const featureDescription = fs.readFileSync(requirementsPath, 'utf-8');

  // Load existing step patterns so the planner reuses them
  const stepsDir = path.join('src', 'steps');
  const existingStepPatterns = StepParser.extractPatternsFromDir(stepsDir);

  console.log(`[Planner] Requirements: ${requirementsPath}`);
  console.log(`[Planner] Found ${existingStepPatterns.length} existing step pattern(s) to reuse`);

  const provider = createProvider();
  const planner = new PlannerAgent(provider);

  const result = await planner.generateFeature({
    featureDescription,
    pageUrl: 'https://demo.playwright.dev/todomvc',
    existingStepPatterns,
  });

  // Derive output filename from requirements filename
  const baseName = path.basename(requirementsPath, '.md');
  const outputPath = path.join('src', 'features', `${baseName}.feature`);

  fs.writeFileSync(outputPath, result.gherkin);

  console.log(`\n[Planner] Feature file saved: ${outputPath}`);
  console.log(`[Planner] Feature: ${result.featureTitle}`);
  console.log(`[Planner] Scenarios:`);
  result.scenarioNames.forEach((name, i) => console.log(`  ${i + 1}. ${name}`));
  console.log(`\nNext step: npm run generate -- ${outputPath}`);
}

main().catch((err) => {
  console.error('[Planner] Fatal error:', err);
  process.exit(1);
});
