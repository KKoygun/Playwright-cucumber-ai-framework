/**
 * AIProvider — the core abstraction for all AI backends.
 *
 * Design decision: coding against an interface (not a concrete class) means
 * the Healer agent never imports Gemini, Claude, or OpenAI directly.
 * Swapping providers is a one-line change in world.ts — no agent code changes.
 * This is the Strategy / Adapter pattern applied to AI integration.
 */

export interface HealingRequest {
  /** The Cucumber scenario name that failed. */
  scenarioName: string;
  /** Full error message from Playwright. */
  errorMessage: string;
  /** Raw HTML of the page at the moment of failure. */
  pageHtml: string;
  /** URL of the page at the moment of failure. */
  pageUrl: string;
}

export interface SelectorSuggestion {
  /** The AI-suggested CSS selector or XPath to replace the broken one. */
  suggestedSelector: string;
  /** How confident the AI is in the suggestion. */
  confidence: 'high' | 'medium' | 'low';
  /** Human-readable explanation of why this selector was chosen. */
  reasoning: string;
}

export interface HealingResponse {
  scenarioName: string;
  errorMessage: string;
  pageUrl: string;
  suggestions: SelectorSuggestion[];
  timestamp: string;
  /** Identifies which AI provider generated this response. */
  provider: string;
  model?: string;
  latencyMs?: number;
  /** Token counts as reported by the provider, when it reports them. */
  tokens?: { input?: number; output?: number };
}

export interface AIProvider {
  /** Human-readable name shown in logs and reports. */
  readonly providerName: string;
  /** Analyse a test failure and return selector healing suggestions. */
  analyzeFailure(request: HealingRequest): Promise<HealingResponse>;
  /**
   * General-purpose text completion — used by PlannerAgent and GeneratorAgent.
   * Returns the raw AI response string for the caller to parse.
   */
  complete(prompt: string): Promise<string>;
}
