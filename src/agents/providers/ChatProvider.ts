import { AIProvider, HealingRequest, HealingResponse } from './AIProvider';
import { buildHealingPrompt, parseSuggestions } from './healingPrompt';

export interface ChatResult {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Base for every provider: the healing flow lives here once, and each provider
 * only implements chat() — one prompt in, text and token counts out.
 */
export abstract class ChatProvider implements AIProvider {
  abstract readonly providerName: string;
  abstract readonly model: string;

  abstract chat(prompt: string): Promise<ChatResult>;

  async complete(prompt: string): Promise<string> {
    return (await this.chat(prompt)).text;
  }

  async analyzeFailure(request: HealingRequest): Promise<HealingResponse> {
    const started = Date.now();
    const result = await this.chat(buildHealingPrompt(request));

    return {
      scenarioName: request.scenarioName,
      errorMessage: request.errorMessage,
      pageUrl: request.pageUrl,
      suggestions: parseSuggestions(result.text),
      timestamp: new Date().toISOString(),
      provider: this.providerName,
      model: this.model,
      latencyMs: Date.now() - started,
      tokens: { input: result.inputTokens, output: result.outputTokens },
    };
  }
}
