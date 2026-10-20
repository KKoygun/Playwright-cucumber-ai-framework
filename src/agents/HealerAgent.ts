import * as fs from 'fs';
import * as path from 'path';
import { AIProvider, HealingRequest, HealingResponse } from './providers/AIProvider';

export type HealMode = 'suggest' | 'apply';

/**
 * healed             the suggestion matched one element and the action succeeded with it
 * not_healed         the suggestion matched zero or several elements, or the retry failed
 * invalid_suggestion no usable selector came back (parse error or invalid syntax)
 */
export type HealOutcome = 'healed' | 'not_healed' | 'invalid_suggestion';

/** One line of reports/healing-events.json. */
export interface HealingEvent extends HealingResponse {
  mode: HealMode;
  outcome?: HealOutcome;
  originalSelector?: string;
  appliedSelector?: string;
}

/** HEAL_MODE=suggest (default) only records suggestions; apply also retries with them. */
export function healMode(): HealMode {
  const mode = process.env.HEAL_MODE || 'suggest';
  if (mode !== 'suggest' && mode !== 'apply') {
    throw new Error(`HEAL_MODE must be "suggest" or "apply", got "${mode}"`);
  }
  return mode;
}

/**
 * HealerAgent — orchestrates AI-powered test failure analysis.
 *
 * Responsibilities:
 *  - Accept a failure context (scenario name, error, page HTML, URL)
 *  - Delegate analysis to the injected AIProvider (Gemini, Claude, OpenAI…)
 *  - Log suggestions to the console for immediate developer feedback
 *  - Persist healing events to reports/healing-events.json for audit trails
 *
 * The agent is intentionally provider-agnostic: it only knows about the
 * AIProvider interface, never about Gemini or any specific model.
 */
export class HealerAgent {
  private readonly reportsDir = 'reports';

  constructor(private readonly provider: AIProvider) {}

  async analyzeFailure(request: HealingRequest): Promise<HealingResponse> {
    console.log(
      `\n[Healer/${this.provider.providerName}] Analysing failure in: "${request.scenarioName}"`
    );

    const response = await this.provider.analyzeFailure(request);

    this.logSuggestions(response);

    return response;
  }

  saveHealingEvent(event: HealingEvent): void {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }

    const filePath = path.join(this.reportsDir, 'healing-events.json');
    const existing: HealingEvent[] = fs.existsSync(filePath)
      ? (JSON.parse(fs.readFileSync(filePath, 'utf-8')) as HealingEvent[])
      : [];

    existing.push(event);
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private logSuggestions(response: HealingResponse): void {
    if (response.suggestions.length === 0) {
      console.log('[Healer] No suggestions returned.');
      return;
    }

    console.log(`[Healer] ${response.suggestions.length} suggestion(s):`);
    response.suggestions.forEach((s, i) => {
      console.log(`  ${i + 1}. [${s.confidence.toUpperCase()}] ${s.suggestedSelector}`);
      console.log(`     Reason: ${s.reasoning}`);
    });
  }
}
