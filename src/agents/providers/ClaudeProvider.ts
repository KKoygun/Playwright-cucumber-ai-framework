import { AIProvider, HealingRequest, HealingResponse } from './AIProvider';

/**
 * ClaudeProvider — Anthropic Claude adapter (stub).
 *
 * To activate:
 *   1. npm install @anthropic-ai/sdk
 *   2. Add ANTHROPIC_API_KEY to your .env file
 *   3. Replace the error below with the Anthropic SDK call
 *   4. In src/support/world.ts, swap GeminiProvider for ClaudeProvider
 *
 * No other file needs to change — that is the point of the adapter pattern.
 *
 * Recommended model: claude-3-5-haiku-latest (fast + cheap for tooling tasks)
 */
export class ClaudeProvider implements AIProvider {
  readonly providerName = 'Claude';

  constructor(private readonly apiKey: string) {
    void this.apiKey; // suppress unused warning until implemented
  }

  async complete(_prompt: string): Promise<string> {
    throw new Error('ClaudeProvider is not yet implemented. See JSDoc for activation steps.');
  }

  async analyzeFailure(_request: HealingRequest): Promise<HealingResponse> {
    throw new Error(
      'ClaudeProvider is not yet implemented. ' +
        'See the JSDoc comment in this file for activation steps.'
    );
  }
}
