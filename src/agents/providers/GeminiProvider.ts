import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIProvider,
  HealingRequest,
  HealingResponse,
  SelectorSuggestion,
} from './AIProvider';

/**
 * GeminiProvider — working AI provider using Google Gemini (free tier).
 *
 * Model: gemini-1.5-flash (fast, generous free quota)
 * Get your API key at: https://aistudio.google.com
 *
 * The prompt is engineered to return strict JSON so parsing is predictable.
 * HTML is stripped of scripts/styles and capped at 8 000 chars to stay
 * within the model's context window without burning tokens on boilerplate.
 */
export class GeminiProvider implements AIProvider {
  readonly providerName = 'Gemini';

  private readonly model: ReturnType<
    InstanceType<typeof GoogleGenerativeAI>['getGenerativeModel']
  >;

  constructor(apiKey: string) {
    if (!apiKey) {
      // Model initialisation is deferred — the healer only runs on test failure,
      // so tests pass normally without an API key being required.
      this.model = null as never;
      return;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
  }

  async analyzeFailure(request: HealingRequest): Promise<HealingResponse> {
    if (!this.model) {
      throw new Error(
        'GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.'
      );
    }

    const prompt = this.buildPrompt(request);
    const result = await this.model.generateContent(prompt);
    const rawText = result.response.text();
    const suggestions = this.parseResponse(rawText);

    return {
      scenarioName: request.scenarioName,
      errorMessage: request.errorMessage,
      pageUrl: request.pageUrl,
      suggestions,
      timestamp: new Date().toISOString(),
      provider: this.providerName,
    };
  }

  async complete(prompt: string): Promise<string> {
    if (!this.model) {
      throw new Error('GEMINI_API_KEY is not set.');
    }
    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private buildPrompt(request: HealingRequest): string {
    const trimmedHtml = request.pageHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .slice(0, 8000);

    return `You are a Playwright test automation expert specialising in selector healing.
A Cucumber BDD test scenario has failed. Analyse the error and the current page HTML, then suggest better CSS selectors or XPath expressions to fix the failing test.

## Failed Scenario
${request.scenarioName}

## Error Message
${request.errorMessage}

## Page URL
${request.pageUrl}

## Current Page HTML (trimmed, scripts and styles removed)
\`\`\`html
${trimmedHtml}
\`\`\`

## Instructions
1. Identify which element the test tried to interact with based on the error message.
2. Suggest 1–3 alternative selectors that would reliably target that element.
3. Selector preference order: data-testid > aria roles > semantic HTML > CSS classes > XPath.
4. Respond ONLY with a valid JSON array — no markdown fences, no explanation outside the array:

[
  {
    "suggestedSelector": "css or xpath selector here",
    "confidence": "high|medium|low",
    "reasoning": "brief explanation of why this selector works"
  }
]`;
  }

  private parseResponse(rawText: string): SelectorSuggestion[] {
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      const parsed: unknown = JSON.parse(cleaned);
      return Array.isArray(parsed) ? (parsed as SelectorSuggestion[]) : [parsed as SelectorSuggestion];
    } catch {
      return [
        {
          suggestedSelector: 'PARSE_ERROR',
          confidence: 'low',
          reasoning: `Could not parse AI response: ${rawText.slice(0, 300)}`,
        },
      ];
    }
  }
}
