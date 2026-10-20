import { ChatProvider, ChatResult } from './ChatProvider';

interface OllamaChatResponse {
  message?: { content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
}

/**
 * OllamaProvider — a model running locally (https://ollama.com), so page HTML
 * never leaves the machine or the company network. No key needed.
 *
 *   ollama pull llama3.1:8b && ollama serve
 */
export class OllamaProvider extends ChatProvider {
  readonly providerName = 'Ollama';
  readonly model: string;

  private readonly host: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: { host?: string; model?: string; fetch?: typeof fetch } = {}) {
    super();
    this.model = options.model || 'llama3.1:8b';
    const host = options.host || 'http://localhost:11434';
    // OLLAMA_HOST is often written without a scheme, e.g. 127.0.0.1:11434
    this.host = (host.includes('://') ? host : `http://${host}`).replace(/\/$/, '');
    this.fetchFn = options.fetch ?? fetch;
  }

  async chat(prompt: string): Promise<ChatResult> {
    let response: Response;
    try {
      response = await this.fetchFn(`${this.host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          options: { temperature: 0.1 },
        }),
      });
    } catch (error) {
      throw new Error(`Could not reach Ollama at ${this.host}. Is "ollama serve" running? (${error})`);
    }

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}: ${await response.text()}`);
    }

    const body = (await response.json()) as OllamaChatResponse;
    return {
      text: body.message?.content ?? '',
      inputTokens: body.prompt_eval_count,
      outputTokens: body.eval_count,
    };
  }
}
