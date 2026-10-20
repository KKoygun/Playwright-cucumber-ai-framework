import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { chromium } from '@playwright/test';
import { HealOutcome } from '../src/agents/HealerAgent';
import { createProvider } from '../src/agents/providers/createProvider';
import { buildHealingPrompt, parseSuggestions } from '../src/agents/providers/healingPrompt';
import { CASES, EVAL_URL, setUpTodos } from '../src/eval/cases';
import { prepareCase, scoreSelector } from '../src/eval/score';

dotenv.config();

/**
 * eval-healer.ts — breaks known TodoMVC selectors on purpose and scores each
 * provider's top suggestion: healed only if it finds exactly the original element.
 *
 *   npm run eval:healer                               replay saved responses (no keys, used in CI)
 *   npm run eval:record -- --providers=groq           call one provider (AI_MODEL) and save its responses
 *   npm run eval:healer -- --check                    only check that every case breaks as intended
 */

interface Cassette {
  provider: string;
  model: string;
  caseId: string;
  promptSha256: string;
  recordedAt: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  text: string;
}

interface Run {
  provider: string;
  model: string;
  caseId: string;
  mutation: string;
  suggestion?: string;
  outcome: HealOutcome;
  healedInTop3: boolean;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  /** The page HTML changed since recording, so the replayed answer is for a slightly different prompt. */
  promptChanged: boolean;
}

const CASSETTE_DIR = path.join('eval', 'cassettes');
const OUT_DIR = 'reports/eval';

const args = process.argv.slice(2);
const record = args.includes('--record');
const checkOnly = args.includes('--check');
const providersArg = args.find((a) => a.startsWith('--providers='))?.split('=')[1];

function providersToRun(): string[] {
  if (providersArg) return providersArg.split(',').map((p) => p.trim().toLowerCase());
  if (record) return [(process.env.AI_PROVIDER || 'groq').toLowerCase()];
  if (!fs.existsSync(CASSETTE_DIR)) return [];
  return fs.readdirSync(CASSETTE_DIR).filter((d) => fs.statSync(path.join(CASSETTE_DIR, d)).isDirectory());
}

const cassettePath = (provider: string, caseId: string) => path.join(CASSETTE_DIR, provider, `${caseId}.json`);
const sha256 = (text: string) => crypto.createHash('sha256').update(text).digest('hex');
const avg = (values: (number | undefined)[]) => {
  const known = values.filter((v): v is number => typeof v === 'number');
  return known.length ? Math.round(known.reduce((a, b) => a + b, 0) / known.length) : undefined;
};

async function main(): Promise<void> {
  const providers = checkOnly ? [] : providersToRun();
  const mode = checkOnly ? 'check' : record ? 'record' : 'replay';

  if (mode === 'replay' && providers.length === 0) {
    console.log(`[Eval] No recorded responses in ${CASSETTE_DIR}. Record them with: npm run eval:record`);
    console.log('[Eval] Checking the cases only.\n');
  }

  if (record) {
    // AI_MODEL names one model of one provider, so record providers one at a time
    if (providers.length > 1) {
      console.error('[Eval] Record one provider at a time: AI_MODEL belongs to a single provider.');
      process.exit(1);
    }
    if (!createProvider(providers[0]).model) {
      console.error('[Eval] AI_MODEL is not set. Run "npm run models" and put one of them in .env.');
      process.exit(1);
    }
  }

  const browser = await chromium.launch();
  const cases: { id: string; mutation: string; selector: string; valid: boolean; note?: string }[] = [];
  const runs: Run[] = [];
  // A rejected key or unknown model fails every case the same way, so stop calling that provider
  const rejected = new Set<string>();

  for (const evalCase of CASES) {
    const page = await browser.newPage();
    await setUpTodos(page);
    const prepared = await prepareCase(page, evalCase);
    cases.push({ id: evalCase.id, mutation: evalCase.mutation, selector: evalCase.selector, valid: prepared.valid, note: prepared.note });
    console.log(`[Eval] ${prepared.valid ? 'ok     ' : 'SKIPPED'} ${evalCase.id}${prepared.note ? ` — ${prepared.note}` : ''}`);

    if (!prepared.valid || providers.length === 0) {
      await page.close();
      continue;
    }

    const prompt = buildHealingPrompt({
      scenarioName: `locate("${evalCase.selector}")`,
      errorMessage: prepared.errorMessage ?? '',
      pageHtml: await page.content(),
      pageUrl: page.url(),
    });

    for (const name of providers.filter((p) => !rejected.has(p))) {
      let cassette: Cassette;

      if (record) {
        const provider = createProvider(name);
        const started = Date.now();
        try {
          const result = await provider.chat(prompt);
          cassette = {
            provider: name,
            model: provider.model,
            caseId: evalCase.id,
            promptSha256: sha256(prompt),
            recordedAt: new Date().toISOString(),
            latencyMs: Date.now() - started,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            text: result.text,
          };
        } catch (error) {
          console.warn(`[Eval]   ${name}: call failed, nothing saved — ${error}`);
          const status = (error as { status?: number }).status;
          if (status === 401 || status === 403 || status === 404) {
            rejected.add(name);
            console.warn(`[Eval]   ${name}: key or model rejected — skipping it for the remaining cases`);
          }
          continue;
        }
        fs.mkdirSync(path.dirname(cassettePath(name, evalCase.id)), { recursive: true });
        fs.writeFileSync(cassettePath(name, evalCase.id), JSON.stringify(cassette, null, 2) + '\n');
      } else {
        if (!fs.existsSync(cassettePath(name, evalCase.id))) {
          console.warn(`[Eval]   ${name}: no recording for ${evalCase.id}`);
          continue;
        }
        cassette = JSON.parse(fs.readFileSync(cassettePath(name, evalCase.id), 'utf-8')) as Cassette;
      }

      const suggestions = parseSuggestions(cassette.text);
      const outcome = await scoreSelector(page, suggestions[0]?.suggestedSelector);
      let healedInTop3 = outcome === 'healed';
      for (const s of suggestions.slice(1, 3)) {
        if (!healedInTop3) healedInTop3 = (await scoreSelector(page, s.suggestedSelector)) === 'healed';
      }

      runs.push({
        provider: name,
        model: cassette.model,
        caseId: evalCase.id,
        mutation: evalCase.mutation,
        suggestion: suggestions[0]?.suggestedSelector,
        outcome,
        healedInTop3,
        latencyMs: cassette.latencyMs,
        inputTokens: cassette.inputTokens,
        outputTokens: cassette.outputTokens,
        promptChanged: cassette.promptSha256 !== sha256(prompt),
      });
      console.log(`[Eval]   ${name}: ${outcome} — ${suggestions[0]?.suggestedSelector ?? 'no suggestion'}`);
    }

    await page.close();
  }

  await browser.close();

  const summary = providers.filter((name) => runs.some((r) => r.provider === name)).map((name) => {
    const own = runs.filter((r) => r.provider === name);
    const healed = own.filter((r) => r.outcome === 'healed').length;
    return {
      provider: name,
      model: own[0]?.model ?? '',
      scored: own.length,
      healed,
      successRate: own.length ? healed / own.length : 0,
      healedInTop3: own.filter((r) => r.healedInTop3).length,
      invalidSuggestions: own.filter((r) => r.outcome === 'invalid_suggestion').length,
      avgLatencyMs: avg(own.map((r) => r.latencyMs)),
      avgInputTokens: avg(own.map((r) => r.inputTokens)),
      avgOutputTokens: avg(own.map((r) => r.outputTokens)),
    };
  });

  const results = { mode, generatedAt: new Date().toISOString(), target: EVAL_URL, cases, summary, runs };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2) + '\n');

  const lines = [
    `# Healer eval — ${mode}`,
    '',
    `${cases.filter((c) => c.valid).length}/${cases.length} cases valid against ${EVAL_URL}.`,
    mode === 'replay' ? 'Latency and tokens come from the recording, not from this run.' : '',
  ];
  if (summary.length > 0) {
    lines.push(
      '| Provider | Model | Healed (top 1) | Success rate | Healed (top 3) | Invalid | Avg latency | Avg tokens in / out |',
      '|---|---|---|---|---|---|---|---|',
      ...summary.map(
        (s) =>
          `| ${s.provider} | ${s.model} | ${s.healed}/${s.scored} | ${(s.successRate * 100).toFixed(0)}% | ${s.healedInTop3}/${s.scored} | ${s.invalidSuggestions} | ${s.avgLatencyMs ?? '—'} ms | ${s.avgInputTokens ?? '—'} / ${s.avgOutputTokens ?? '—'} |`
      )
    );
  }
  if (runs.some((r) => r.promptChanged)) {
    lines.push('', 'Note: the page HTML changed since some responses were recorded. Re-record for exact numbers.');
  }
  fs.writeFileSync(path.join(OUT_DIR, 'results.md'), lines.join('\n') + '\n');

  console.log(`\n${lines.join('\n')}\n\n[Eval] Written to ${OUT_DIR}/results.json and results.md`);
}

main().catch((error) => {
  console.error('[Eval] Fatal error:', error);
  process.exit(1);
});
