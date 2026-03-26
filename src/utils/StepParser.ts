import * as fs from 'fs';
import * as path from 'path';

/**
 * StepParser — shared utility for extracting and matching Cucumber step patterns.
 *
 * Used by the generate.ts script to determine which steps in a .feature file
 * already have a step definition and which ones need to be generated.
 */
export class StepParser {
  /**
   * Extracts all step definition patterns from .ts files in a directory.
   * Matches: Given('...'), When('...'), Then('...'), And('...')
   */
  static extractPatternsFromDir(stepsDir: string): string[] {
    const patterns: string[] = [];
    const files = fs.readdirSync(stepsDir).filter((f) => f.endsWith('.ts'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(stepsDir, file), 'utf-8');
      const matches = content.matchAll(/(?:Given|When|Then|And|But)\s*\(\s*['"](.+?)['"]/g);
      for (const match of matches) {
        patterns.push(match[1]);
      }
    }

    return [...new Set(patterns)]; // deduplicate
  }

  /**
   * Extracts step texts from a .feature file (strips the keyword prefix).
   * Returns unique step texts only.
   */
  static extractStepsFromFeature(featurePath: string): string[] {
    const content = fs.readFileSync(featurePath, 'utf-8');
    const steps: string[] = [];
    const matches = content.matchAll(/^\s*(?:Given|When|Then|And|But)\s+(.+)$/gm);

    for (const match of matches) {
      const stepText = match[1].trim();
      // Strip inline example values e.g. "Buy groceries" → leave as-is for matching
      steps.push(stepText);
    }

    return [...new Set(steps)];
  }

  /**
   * Returns step texts from the feature that have no matching step definition.
   *
   * Matching logic:
   *   - {string} in a pattern matches any quoted value in the step text
   *   - {int} in a pattern matches any number
   * This mirrors how Cucumber resolves step definitions at runtime.
   */
  static findMissingSteps(featureSteps: string[], existingPatterns: string[]): string[] {
    return featureSteps.filter(
      (step) => !existingPatterns.some((pattern) => this.matches(step, pattern))
    );
  }

  /**
   * Converts a Cucumber step pattern to a regex and tests it against a step text.
   */
  static matches(stepText: string, pattern: string): boolean {
    // Temporarily replace cucumber params before escaping special regex chars
    const tokenised = pattern
      .replace(/\{string\}/g, '__STR__')
      .replace(/\{int\}/g, '__INT__');

    const escaped = tokenised.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const regexStr = escaped
      .replace(/__STR__/g, '["\']?.+?["\']?')
      .replace(/__INT__/g, '\\d+');

    const regex = new RegExp(`^${regexStr}$`, 'i');
    return regex.test(stepText);
  }
}
