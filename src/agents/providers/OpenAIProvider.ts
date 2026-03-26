import { AIProvider, HealingRequest, HealingResponse } from './AIProvider';

/**
 * OpenAIProvider — OpenAI GPT adapter (stub).
 *
 * To activate:
 *   1. npm install openai
 *   2. Add OPENAI_API_KEY to your .env file
 *   3. Replace the error below with the OpenAI SDK call
 *   4. In src/support/world.ts, swap GeminiProvider for OpenAIProvider
 *
 * No other file needs to change — that is the point of the adapter pattern.
 *
 * Recommended model: gpt-4o-mini (cost-effective for selector analysis)
 */
export class OpenAIProvider implements AIProvider {
  readonly providerName = 'OpenAI';

  constructor(private readonly apiKey: string) {
    void this.apiKey; // suppress unused warning until implemented
  }

  async complete(_prompt: string): Promise<string> {
    throw new Error('OpenAIProvider is not yet implemented. See JSDoc for activation steps.');
  }

  async analyzeFailure(_request: HealingRequest): Promise<HealingResponse> {
    throw new Error(
      'OpenAIProvider is not yet implemented. ' +
        'See the JSDoc comment in this file for activation steps.'
    );
  }
}
