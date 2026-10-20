import { AIProvider } from './providers/AIProvider';

export interface GeneratorRequest {
  /** Step texts from the .feature file that have no matching step definition yet. */
  missingSteps: string[];
  /** Source of the Page Object so the AI uses existing methods rather than raw selectors. */
  pomContent: string;
}

export interface GeneratorResponse {
  /** Ready-to-use TypeScript step definition code. */
  stepCode: string;
}

/**
 * GeneratorAgent — generates TypeScript step definitions for missing Gherkin steps.
 *
 * Input:  step texts that exist in a .feature file but have no implementation yet
 *         + the Page Object source so the AI references real methods
 * Output: TypeScript step definition code, ready to save into src/steps/
 *
 * Steps that already have a matching definition are skipped upstream (in the
 * generate.ts script) before this agent is ever called — so this agent only
 * ever sees truly missing steps.
 */
export class GeneratorAgent {
  constructor(private readonly provider: AIProvider) {}

  async generateSteps(request: GeneratorRequest): Promise<GeneratorResponse> {
    console.log(
      `[Generator/${this.provider.providerName}] Generating ${request.missingSteps.length} step definition(s)...`
    );

    const prompt = this.buildPrompt(request);
    const raw = await this.provider.complete(prompt);
    return { stepCode: this.clean(raw) };
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private buildPrompt(request: GeneratorRequest): string {
    const steps = request.missingSteps.map((s) => `  - ${s}`).join('\n');

    return `You are a Playwright + Cucumber TypeScript expert. Generate step definitions for the steps listed below.

## Steps to implement
${steps}

## Available Page Object (use its methods — do not write raw Playwright selectors)
\`\`\`typescript
${request.pomContent}
\`\`\`

## Rules
- Import: import { Given, When, Then } from '@cucumber/cucumber';
- Import: import { CustomWorld } from '../support/world';
- Import: import { TodoPage } from '../pages/TodoPage';
- Use async function (this: CustomWorld, ...)
- Create the page object with: new TodoPage(this.page, this.healing)
- Use Cucumber parameter types: {string} for strings, {int} for numbers
- Convert 1-based step index to 0-based when calling page object methods (index - 1)
- Return ONLY valid TypeScript — no markdown fences, no explanation, no imports duplication`;
  }

  private clean(raw: string): string {
    return raw.replace(/```typescript|```ts|```/g, '').trim();
  }
}
