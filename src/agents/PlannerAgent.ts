import { AIProvider } from './providers/AIProvider';

export interface PlannerRequest {
  /** Raw content of the plain-English requirements .md file. */
  featureDescription: string;
  /** URL of the application under test. */
  pageUrl: string;
  /** Existing step patterns so the planner reuses them instead of inventing new ones. */
  existingStepPatterns: string[];
}

export interface PlannerResponse {
  /** Gherkin Feature block title. */
  featureTitle: string;
  /** List of generated scenario names. */
  scenarioNames: string[];
  /** Full Gherkin .feature file content, ready to save. */
  gherkin: string;
}

/**
 * PlannerAgent — generates Gherkin .feature files from plain-English requirements.
 *
 * Input:  a .md file describing what the feature should do (your "Jira ticket")
 * Output: a .feature file with proper Given/When/Then scenarios
 *
 * The agent is given existing step patterns so it reuses them wherever possible —
 * only truly new behaviour gets new step wording. This keeps feature files
 * consistent and minimises the work for the GeneratorAgent downstream.
 */
export class PlannerAgent {
  constructor(private readonly provider: AIProvider) {}

  async generateFeature(request: PlannerRequest): Promise<PlannerResponse> {
    console.log(`[Planner/${this.provider.providerName}] Generating feature from requirements...`);

    const prompt = this.buildPrompt(request);
    const raw = await this.provider.complete(prompt);
    return this.parseResponse(raw);
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private buildPrompt(request: PlannerRequest): string {
    const patterns = request.existingStepPatterns.map((p) => `  - ${p}`).join('\n');

    return `You are a BDD test automation expert. Convert the requirements below into a Gherkin .feature file.

## Requirements
${request.featureDescription}

## Application URL
${request.pageUrl}

## Existing step patterns (reuse these EXACTLY when they apply — do NOT rephrase them)
${patterns}

## Rules
- Use Feature, Background (with "Given I am on the TodoMVC application"), Scenario
- Maximum 2 focused scenarios
- Reuse existing step patterns wherever they fit
- Only introduce new step wording for behaviour not covered by existing steps
- Return ONLY a JSON object, no markdown fences:

{
  "featureTitle": "...",
  "scenarioNames": ["..."],
  "gherkin": "Feature: ...\\n\\n  Background:\\n    Given I am on the TodoMVC application\\n\\n  Scenario: ...\\n    ..."
}`;
  }

  private parseResponse(raw: string): PlannerResponse {
    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned) as PlannerResponse;
    } catch {
      return { featureTitle: 'Generated Feature', scenarioNames: [], gherkin: raw };
    }
  }
}
