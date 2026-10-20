import OpenAI from 'openai';
import { ChatProvider, ChatResult } from './ChatProvider';

/**
 * OpenAIProvider — OpenAI Chat Completions API.
 * Needs a pay-as-you-go key from https://platform.openai.com (a ChatGPT plan does not include API access).
 */
export class OpenAIProvider extends ChatProvider {
  readonly providerName = 'OpenAI';

  private readonly client: OpenAI | null;

  constructor(apiKey: string, options: { model?: string; fetch?: typeof fetch } = {}) {
    super(options.model ?? '');
    this.client = apiKey ? new OpenAI({ apiKey, fetch: options.fetch }) : null;
  }

  async listModels(): Promise<string[]> {
    const ids: string[] = [];
    for await (const model of this.requireClient().models.list()) ids.push(model.id);
    return ids;
  }

  protected async send(prompt: string): Promise<ChatResult> {
    const completion = await this.requireClient().chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      text: completion.choices[0]?.message?.content ?? '',
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
    };
  }

  private requireClient(): OpenAI {
    if (!this.client) throw new Error('OPENAI_API_KEY (or AI_API_KEY) is not set. Copy .env.example to .env and add your key.');
    return this.client;
  }
}
