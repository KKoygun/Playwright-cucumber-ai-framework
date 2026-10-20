import OpenAI from 'openai';
import { ChatProvider, ChatResult } from './ChatProvider';

/**
 * OpenAIProvider — OpenAI Chat Completions API.
 * Needs a pay-as-you-go key from https://platform.openai.com (a ChatGPT plan does not include API access).
 */
export class OpenAIProvider extends ChatProvider {
  readonly providerName = 'OpenAI';
  readonly model: string;

  private readonly client: OpenAI | null;

  constructor(apiKey: string, options: { model?: string; fetch?: typeof fetch } = {}) {
    super();
    this.model = options.model || 'gpt-4.1-mini';
    this.client = apiKey ? new OpenAI({ apiKey, fetch: options.fetch }) : null;
  }

  async chat(prompt: string): Promise<ChatResult> {
    if (!this.client) {
      throw new Error('OPENAI_API_KEY is not set. Copy .env.example to .env and add your key.');
    }

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      text: completion.choices[0]?.message?.content ?? '',
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
    };
  }
}
