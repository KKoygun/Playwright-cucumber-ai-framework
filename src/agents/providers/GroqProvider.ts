import Groq from 'groq-sdk';
import { ChatProvider, ChatResult } from './ChatProvider';

/**
 * GroqProvider — open models (gpt-oss, Qwen, Llama) on Groq (free tier, no billing required).
 * Get a free key at https://console.groq.com
 */
export class GroqProvider extends ChatProvider {
  readonly providerName = 'Groq';

  private readonly client: Groq | null;

  constructor(apiKey: string, options: { model?: string; fetch?: typeof fetch } = {}) {
    super(options.model ?? '');
    this.client = apiKey ? new Groq({ apiKey, fetch: options.fetch }) : null;
  }

  async listModels(): Promise<string[]> {
    const response = await this.requireClient().models.list();
    return response.data.map((m) => m.id);
  }

  protected async send(prompt: string): Promise<ChatResult> {
    const completion = await this.requireClient().chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });

    return {
      text: completion.choices[0]?.message?.content ?? '',
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
    };
  }

  private requireClient(): Groq {
    if (!this.client) throw new Error('AI_API_KEY is not set. Copy .env.example to .env and add your key.');
    return this.client;
  }
}
