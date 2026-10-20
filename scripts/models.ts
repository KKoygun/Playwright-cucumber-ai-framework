import * as dotenv from 'dotenv';
import { createProvider } from '../src/agents/providers/createProvider';

dotenv.config();

/**
 * models.ts — lists the models your AI_API_KEY can use with AI_PROVIDER,
 * so AI_MODEL can be set to one that exists.
 *
 *   npm run models
 */
async function main(): Promise<void> {
  const provider = createProvider();
  const models = (await provider.listModels()).sort();

  console.log(`${provider.providerName} models available to your key (${models.length}):\n`);
  for (const id of models) console.log(`  ${id}${id === provider.model ? '   <- AI_MODEL' : ''}`);
  console.log('\nSet one of these as AI_MODEL in .env. Not every model is a chat model (some are speech or safety filters).');
}

main().catch((err) => {
  console.error(`[models] ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
