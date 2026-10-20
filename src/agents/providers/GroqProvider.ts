import Groq from 'groq-sdk';
import { ChatProvider, ChatResult } from './ChatProvider';

/**
 * GroqProvider — Llama models on Groq (free tier, no billing required).
 * Get a free key at https://console.groq.com
 */
export class GroqProvider extends ChatProvider {
  readonly providerName = 'Groq';
  readonly model: string;

  private readonly client: Groq | null;

  constructor(
    apiKey: string,
    options: { model?: string; fetch?: typeof fetch } = {}
  ) {
    super();
    this.model = options.model || 'llama-3.3-70b-versatile';
    this.client = apiKey ? new Groq({ apiKey, fetch: options.fetch }) : null;
  }

  async chat(prompt: string): Promise<ChatResult> {
    if (!this.client) {
      throw new Error('GROQ_API_KEY is not set. Copy .env.example to .env and add your key.');
    }

    const completion = await this.client.chat.completions.create({
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
}
