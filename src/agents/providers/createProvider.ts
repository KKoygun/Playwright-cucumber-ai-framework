import { ChatProvider } from './ChatProvider';
import { ClaudeProvider } from './ClaudeProvider';
import { GeminiProvider } from './GeminiProvider';
import { GroqProvider } from './GroqProvider';
import { OllamaProvider } from './OllamaProvider';
import { OpenAIProvider } from './OpenAIProvider';

export const PROVIDER_NAMES = ['groq', 'gemini', 'claude', 'openai', 'ollama'] as const;

/**
 * Picks the provider from AI_PROVIDER (default groq). AI_MODEL overrides the
 * provider's default model.
 */
export function createProvider(name = process.env.AI_PROVIDER || 'groq'): ChatProvider {
  const env = process.env;
  const model = env.AI_MODEL;

  switch (name.toLowerCase()) {
    case 'groq':
      return new GroqProvider(env.GROQ_API_KEY ?? '', { model });
    case 'gemini':
      return new GeminiProvider(env.GEMINI_API_KEY ?? '', { model });
    case 'claude':
      return new ClaudeProvider(env.ANTHROPIC_API_KEY ?? '', { model });
    case 'openai':
      return new OpenAIProvider(env.OPENAI_API_KEY ?? '', { model });
    case 'ollama':
      return new OllamaProvider({ host: env.OLLAMA_HOST, model });
    default:
      throw new Error(`Unknown AI_PROVIDER "${name}". Use one of: ${PROVIDER_NAMES.join(', ')}`);
  }
}
