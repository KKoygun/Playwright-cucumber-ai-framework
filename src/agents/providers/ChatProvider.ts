import { AIProvider, HealingRequest, HealingResponse } from './AIProvider';
import { buildHealingPrompt, parseSuggestions } from './healingPrompt';

export interface ChatResult {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Base for every provider: the healing flow lives here once, and each provider
 * only implements send() (one prompt in, text and token counts out) and
 * listModels().
 *
 * There is no default model. AI_MODEL is used exactly as given; if the provider
 * does not have it, the call fails and says how to find one that exists.
 */
export abstract class ChatProvider implements AIProvider {
  abstract readonly providerName: string;

  constructor(readonly model: string) {}

  protected abstract send(prompt: string): Promise<ChatResult>;

  /** Model ids this key can use, for `npm run models`. */
  abstract listModels(): Promise<string[]>;

  async chat(prompt: string): Promise<ChatResult> {
    if (!this.model) {
      throw new Error(`AI_MODEL is not set. Run "npm run models" to see which ${this.providerName} models your key can use.`);
    }
    try {
      return await this.send(prompt);
    } catch (error) {
      if ((error as { status?: number }).status === 404) {
        const message = `${this.providerName} has no model "${this.model}" for your key. Run "npm run models" and set AI_MODEL to one of them.`;
        throw Object.assign(new Error(message), { status: 404 });
      }
      throw error;
    }
  }

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
