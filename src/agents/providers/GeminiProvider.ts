import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { ChatProvider, ChatResult } from './ChatProvider';

/**
 * GeminiProvider — Google Gemini (free tier).
 * Get a key at https://aistudio.google.com
 */
export class GeminiProvider extends ChatProvider {
  readonly providerName = 'Gemini';
  readonly model: string;

  private readonly client: GenerativeModel | null;

  constructor(apiKey: string, options: { model?: string } = {}) {
    super();
    this.model = options.model || 'gemini-2.0-flash-lite';
    // The key is checked lazily: the healer only runs on failure, so tests pass without one.
    this.client = apiKey ? new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: this.model }) : null;
  }

  async chat(prompt: string): Promise<ChatResult> {
    if (!this.client) {
      throw new Error('GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.');
    }

    const result = await this.client.generateContent(prompt);
    const usage = result.response.usageMetadata;

    return {
      text: result.response.text(),
      inputTokens: usage?.promptTokenCount,
      outputTokens: usage?.candidatesTokenCount,
    };
  }
}
