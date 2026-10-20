import Anthropic from '@anthropic-ai/sdk';
import { ChatProvider, ChatResult } from './ChatProvider';

/**
 * ClaudeProvider — Anthropic Messages API.
 * Needs an API key from https://console.anthropic.com (separate from a Claude.ai subscription).
 */
export class ClaudeProvider extends ChatProvider {
  readonly providerName = 'Claude';
  readonly model: string;

  private readonly client: Anthropic | null;

  constructor(apiKey: string, options: { model?: string; fetch?: typeof fetch } = {}) {
    super();
    this.model = options.model || 'claude-opus-5-5';
    this.client = apiKey ? new Anthropic({ apiKey, fetch: options.fetch }) : null;
  }

  async chat(prompt: string): Promise<ChatResult> {
    if (!this.client) {
      throw new Error('ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.');
    }

    const response = await this.client.beta.messages.create({
      model: this.model,
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
      // If the model declines, the API retries on a fallback model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });

    if (response.stop_reason === 'refusal') {
      throw new Error(`Claude declined the request (${response.stop_details?.category ?? 'no category'})`);
    }

    const text = response.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('');

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}
