import Groq from 'groq-sdk';
import {
  AIProvider,
  HealingRequest,
  HealingResponse,
  SelectorSuggestion,
} from './AIProvider';

/**
 * GroqProvider — working AI provider using Groq (free tier, no billing required).
 *
 * Model: llama-3.3-70b-versatile (highly capable, generous free quota)
 * Get your free API key at: https://console.groq.com
 *
 * Groq runs open-source models (Llama, Mixtral) on custom inference hardware,
 * making it significantly faster than hosted model APIs for the same model size.
 */
export class GroqProvider implements AIProvider {
  readonly providerName = 'Groq';

  private readonly client: Groq;

  constructor(apiKey: string) {
    if (!apiKey) {
      this.client = null as never;
      return;
    }
    this.client = new Groq({ apiKey });
  }

  async analyzeFailure(request: HealingRequest): Promise<HealingResponse> {
    if (!this.client) {
      throw new Error(
        'GROQ_API_KEY is not set. Copy .env.example to .env and add your key.'
      );
    }

    const prompt = this.buildPrompt(request);

    const completion = await this.client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });

    const rawText = completion.choices[0]?.message?.content ?? '';
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
    if (!this.client) {
      throw new Error('GROQ_API_KEY is not set.');
    }
    const completion = await this.client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });
    return completion.choices[0]?.message?.content ?? '';
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
      return Array.isArray(parsed)
        ? (parsed as SelectorSuggestion[])
        : [parsed as SelectorSuggestion];
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
