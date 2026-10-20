import * as dotenv from 'dotenv';
import { createProvider } from '../src/agents/providers/createProvider';

dotenv.config();

/**
 * models.ts — lists the models your key can use with AI_PROVIDER,
 * so AI_MODEL can be set to one that exists.
 *
 *   npm run models
 *   npm run models -- gpt-4.1     only names containing "gpt-4.1"
 */
async function main(): Promise<void> {
  const provider = createProvider();
  const filter = process.argv[2]?.toLowerCase();
  const models = (await provider.listModels())
    .filter((id) => !filter || id.toLowerCase().includes(filter))
    .sort();

  const matching = filter ? ` matching "${filter}"` : '';
  console.log(`${provider.providerName} models available to your key${matching} (${models.length}):\n`);
  for (const id of models) console.log(`  ${id}${id === provider.model ? '   <- AI_MODEL' : ''}`);
  console.log('\nSet one of these as AI_MODEL in .env. Not every model is a chat model (some are speech or safety filters).');
}

main().catch((err) => {
  console.error(`[models] ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
