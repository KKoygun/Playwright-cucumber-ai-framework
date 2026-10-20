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
 *   ollama pull <model> && ollama serve
 */
export class OllamaProvider extends ChatProvider {
  readonly providerName = 'Ollama';

  private readonly host: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: { host?: string; model?: string; fetch?: typeof fetch } = {}) {
    super(options.model ?? '');
    const host = options.host || 'http://localhost:11434';
    // OLLAMA_HOST is often written without a scheme, e.g. 127.0.0.1:11434
    this.host = (host.includes('://') ? host : `http://${host}`).replace(/\/$/, '');
    this.fetchFn = options.fetch ?? fetch;
  }

  /** Models pulled into the local Ollama. */
  async listModels(): Promise<string[]> {
    const response = await this.request('/api/tags');
    const body = (await response.json()) as { models?: { name: string }[] };
    return (body.models ?? []).map((m) => m.name);
  }

  protected async send(prompt: string): Promise<ChatResult> {
    const response = await this.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        options: { temperature: 0.1 },
      }),
    });

    const body = (await response.json()) as OllamaChatResponse;
    return {
      text: body.message?.content ?? '',
      inputTokens: body.prompt_eval_count,
      outputTokens: body.eval_count,
    };
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
    let response: Response;
    try {
      response = await this.fetchFn(`${this.host}${path}`, init);
    } catch (error) {
      throw new Error(`Could not reach Ollama at ${this.host}. Is "ollama serve" running? (${error})`);
    }
    if (!response.ok) {
      // Keep the status so a 404 (model not pulled) gets the same message as other providers
      throw Object.assign(new Error(`Ollama returned ${response.status}: ${await response.text()}`), {
        status: response.status,
      });
    }
    return response;
  }
}
