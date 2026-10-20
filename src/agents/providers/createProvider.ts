import { ChatProvider } from './ChatProvider';
import { ClaudeProvider } from './ClaudeProvider';
import { GeminiProvider } from './GeminiProvider';
import { GroqProvider } from './GroqProvider';
import { OllamaProvider } from './OllamaProvider';
import { OpenAIProvider } from './OpenAIProvider';

export const PROVIDER_NAMES = ['groq', 'gemini', 'claude', 'openai', 'ollama'] as const;

/**
 * Picks the provider from AI_PROVIDER (default groq) and gives it AI_API_KEY and
 * AI_MODEL. There is no default model: npm run models lists what the key can use.
 * The provider-specific key names (GROQ_API_KEY, ...) still work, e.g. for CI secrets.
 */
export function createProvider(name = process.env.AI_PROVIDER || 'groq'): ChatProvider {
  const env = process.env;
  const model = env.AI_MODEL;
  const key = (fallback: string | undefined) => env.AI_API_KEY || fallback || '';

  switch (name.toLowerCase()) {
    case 'groq':
      return new GroqProvider(key(env.GROQ_API_KEY), { model });
    case 'gemini':
      return new GeminiProvider(key(env.GEMINI_API_KEY), { model });
    case 'claude':
      return new ClaudeProvider(key(env.ANTHROPIC_API_KEY), { model });
    case 'openai':
      return new OpenAIProvider(key(env.OPENAI_API_KEY), { model });
    case 'ollama':
      return new OllamaProvider({ host: env.OLLAMA_HOST, model });
    default:
      throw new Error(`Unknown AI_PROVIDER "${name}". Use one of: ${PROVIDER_NAMES.join(', ')}`);
  }
}
