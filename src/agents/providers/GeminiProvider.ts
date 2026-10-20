import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatProvider, ChatResult } from './ChatProvider';

/**
 * GeminiProvider — Google Gemini (free tier).
 * Get a key at https://aistudio.google.com
 */
export class GeminiProvider extends ChatProvider {
  readonly providerName = 'Gemini';

  // The key is checked lazily: the healer only runs on failure, so tests pass without one.
  private readonly client: GoogleGenerativeAI | null;

  constructor(private readonly apiKey: string, options: { model?: string } = {}) {
    super(options.model ?? '');
    this.client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  async listModels(): Promise<string[]> {
    this.requireClient();
    // This SDK has no list call, so it goes to the REST endpoint directly
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
      headers: { 'x-goog-api-key': this.apiKey },
    });
    if (!response.ok) throw new Error(`Gemini returned ${response.status}: ${await response.text()}`);

    const body = (await response.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    return (body.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''));
  }

  protected async send(prompt: string): Promise<ChatResult> {
    const result = await this.requireClient().getGenerativeModel({ model: this.model }).generateContent(prompt);
    const usage = result.response.usageMetadata;

    return {
      text: result.response.text(),
      inputTokens: usage?.promptTokenCount,
      outputTokens: usage?.candidatesTokenCount,
    };
  }

  private requireClient(): GoogleGenerativeAI {
    if (!this.client) throw new Error('GEMINI_API_KEY (or AI_API_KEY) is not set. Copy .env.example to .env and add your key.');
    return this.client;
  }
}
