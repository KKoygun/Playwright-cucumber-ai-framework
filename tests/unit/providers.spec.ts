import { test, expect } from '@playwright/test';
import { ClaudeProvider } from '../../src/agents/providers/ClaudeProvider';
import { GeminiProvider } from '../../src/agents/providers/GeminiProvider';
import { GroqProvider } from '../../src/agents/providers/GroqProvider';
import { OllamaProvider } from '../../src/agents/providers/OllamaProvider';
import { OpenAIProvider } from '../../src/agents/providers/OpenAIProvider';
import { FAILURE, SUGGESTION_JSON, fakeFetch } from './fakeFetch';

const chatCompletion = (content: string) => ({
  id: 'chatcmpl-1',
  object: 'chat.completion',
  created: 0,
  model: 'test-model',
  choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 812, completion_tokens: 41, total_tokens: 853 },
});

test.describe('ClaudeProvider', () => {
  const message = {
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5-5',
    content: [{ type: 'text', text: SUGGESTION_JSON }],
    stop_reason: 'end_turn',
    stop_details: null,
    usage: { input_tokens: 900, output_tokens: 55 },
  };

  test('posts to the Messages API and maps suggestions and usage', async () => {
    const { fetch, calls } = fakeFetch(message);
    const provider = new ClaudeProvider('test-key', { fetch, model: 'claude-opus-5-5' });

    const result = await provider.analyzeFailure(FAILURE);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('https://api.anthropic.com/v1/messages');
    expect(calls[0].headers.get('x-api-key')).toBe('test-key');
    expect(calls[0].body.model).toBe('claude-opus-5-5');
    expect(calls[0].body.fallbacks).toBe('default');
    expect(result.suggestions[0].suggestedSelector).toBe('[data-testid="todo-title"]');
    expect(result).toMatchObject({ provider: 'Claude', model: 'claude-opus-5-5', tokens: { input: 900, output: 55 } });
  });

  test('throws when the model declines', async () => {
    const { fetch } = fakeFetch({ ...message, content: [], stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'cyber', explanation: null } });
    await expect(new ClaudeProvider('test-key', { fetch, model: 'claude-opus-5-5' }).complete('hi')).rejects.toThrow('declined');
  });

  test('surfaces an auth failure', async () => {
    const { fetch } = fakeFetch({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }, 401);
    await expect(new ClaudeProvider('bad-key', { fetch, model: 'claude-opus-5-5' }).complete('hi')).rejects.toThrow('invalid x-api-key');
  });
});

test.describe('OpenAIProvider', () => {
  test('posts to chat completions with a bearer token', async () => {
    const { fetch, calls } = fakeFetch(chatCompletion(SUGGESTION_JSON));
    const provider = new OpenAIProvider('sk-test', { fetch, model: 'gpt-test' });

    const result = await provider.analyzeFailure(FAILURE);

    expect(calls[0].url).toBe('https://api.openai.com/v1/chat/completions');
    expect(calls[0].headers.get('authorization')).toBe('Bearer sk-test');
    expect(calls[0].body.model).toBe('gpt-test');
    expect(result.suggestions).toHaveLength(1);
    expect(result.tokens).toEqual({ input: 812, output: 41 });
  });
});

test.describe('GroqProvider', () => {
  test('posts to the Groq OpenAI-compatible endpoint', async () => {
    const { fetch, calls } = fakeFetch(chatCompletion(SUGGESTION_JSON));
    const provider = new GroqProvider('gsk-test', { fetch, model: 'openai/gpt-oss-120b' });

    const result = await provider.analyzeFailure(FAILURE);

    expect(calls[0].url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(calls[0].headers.get('authorization')).toBe('Bearer gsk-test');
    expect(calls[0].body.model).toBe('openai/gpt-oss-120b');
    expect(result.model).toBe('openai/gpt-oss-120b');
  });
});

test.describe('GeminiProvider', () => {
  // The Gemini SDK has no fetch option, so the global one is swapped for this test.
  test('calls generateContent and reads usageMetadata', async () => {
    const { fetch, calls } = fakeFetch({
      candidates: [{ index: 0, finishReason: 'STOP', content: { role: 'model', parts: [{ text: SUGGESTION_JSON }] } }],
      usageMetadata: { promptTokenCount: 700, candidatesTokenCount: 30, totalTokenCount: 730 },
    });
    const original = globalThis.fetch;
    globalThis.fetch = fetch;
    try {
      const result = await new GeminiProvider('g-test', { model: 'gemini-2.0-flash-lite' }).analyzeFailure(FAILURE);

      expect(calls[0].url).toContain('generativelanguage.googleapis.com');
      expect(calls[0].url).toContain('gemini-2.0-flash-lite:generateContent');
      expect(calls[0].headers.get('x-goog-api-key')).toBe('g-test');
      expect(result.tokens).toEqual({ input: 700, output: 30 });
    } finally {
      globalThis.fetch = original;
    }
  });
});

test.describe('OllamaProvider', () => {
  test('posts to the local /api/chat endpoint without streaming', async () => {
    const { fetch, calls } = fakeFetch({ message: { role: 'assistant', content: SUGGESTION_JSON }, prompt_eval_count: 640, eval_count: 52 });
    const provider = new OllamaProvider({ fetch, model: 'llama3.1:8b' });

    const result = await provider.analyzeFailure(FAILURE);

    expect(calls[0].url).toBe('http://localhost:11434/api/chat');
    expect(calls[0].body).toMatchObject({ model: 'llama3.1:8b', stream: false });
    expect(result.tokens).toEqual({ input: 640, output: 52 });
  });

  test('accepts OLLAMA_HOST without a scheme', async () => {
    const { fetch, calls } = fakeFetch({ message: { content: '[]' } });
    await new OllamaProvider({ fetch, host: '10.0.0.5:11434', model: 'llama3.1:8b' }).complete('hi');
    expect(calls[0].url).toBe('http://10.0.0.5:11434/api/chat');
  });

  test('explains a refused connection', async () => {
    const refused = (async () => { throw new TypeError('fetch failed'); }) as typeof fetch;
    await expect(new OllamaProvider({ fetch: refused, model: 'llama3.1:8b' }).complete('hi')).rejects.toThrow('ollama serve');
  });

  test('surfaces an HTTP error', async () => {
    const { fetch } = fakeFetch({ error: 'model "nope" not found' }, 404);
    await expect(new OllamaProvider({ fetch, model: 'nope' }).complete('hi')).rejects.toThrow('npm run models');
  });
});

test('hosted providers fail fast without a key and never call the network', async () => {
  const { fetch, calls } = fakeFetch({});
  await expect(new ClaudeProvider('', { fetch, model: 'm' }).complete('hi')).rejects.toThrow('AI_API_KEY');
  await expect(new OpenAIProvider('', { fetch, model: 'm' }).complete('hi')).rejects.toThrow('AI_API_KEY');
  await expect(new GroqProvider('', { fetch, model: 'm' }).complete('hi')).rejects.toThrow('AI_API_KEY');
  await expect(new GeminiProvider('', { model: 'm' }).complete('hi')).rejects.toThrow('AI_API_KEY');
  expect(calls).toHaveLength(0);
});

test.describe('model selection', () => {
  test('there is no default model: a call without AI_MODEL says how to find one', async () => {
    const { fetch, calls } = fakeFetch({});
    await expect(new GroqProvider('gsk-test', { fetch }).complete('hi')).rejects.toThrow('AI_MODEL is not set');
    expect(calls).toHaveLength(0);
  });

  test('an unknown model fails with a pointer to npm run models, never a different model', async () => {
    const { fetch, calls } = fakeFetch({ error: { message: 'The model does not exist', code: 'model_not_found' } }, 404);
    const provider = new GroqProvider('gsk-test', { fetch, model: 'retired-model' });

    await expect(provider.complete('hi')).rejects.toThrow('Groq has no model "retired-model"');
    expect(calls).toHaveLength(1);
    expect(calls[0].body.model).toBe('retired-model');
  });

  test('listModels returns the ids the key can use', async () => {
    const groq = fakeFetch({ object: 'list', data: [{ id: 'openai/gpt-oss-120b', object: 'model' }, { id: 'qwen/qwen3.8-27b', object: 'model' }] });
    expect(await new GroqProvider('gsk-test', { fetch: groq.fetch }).listModels()).toEqual(['openai/gpt-oss-120b', 'qwen/qwen3.8-27b']);
    expect(groq.calls[0].url).toBe('https://api.groq.com/openai/v1/models');

    const ollama = fakeFetch({ models: [{ name: 'llama3.1:8b' }, { name: 'qwen2.5-coder:7b' }] });
    expect(await new OllamaProvider({ fetch: ollama.fetch }).listModels()).toEqual(['llama3.1:8b', 'qwen2.5-coder:7b']);
    expect(ollama.calls[0].url).toBe('http://localhost:11434/api/tags');
  });
});
