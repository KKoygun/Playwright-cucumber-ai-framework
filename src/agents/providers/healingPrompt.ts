import { HealingRequest, SelectorSuggestion } from './AIProvider';

/** The selector-healing prompt, shared by every provider so results are comparable. */
export function buildHealingPrompt(request: HealingRequest): string {
  // Scripts and styles are noise for selector work; the cap keeps small models inside their context.
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

export function parseSuggestions(rawText: string): SelectorSuggestion[] {
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
