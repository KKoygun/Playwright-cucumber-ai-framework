import { test, expect } from '@playwright/test';
import { buildHealingPrompt, parseSuggestions } from '../../src/agents/providers/healingPrompt';
import { createProvider } from '../../src/agents/providers/createProvider';
import { FAILURE } from './fakeFetch';

test('prompt strips scripts and carries the error and url', () => {
  const prompt = buildHealingPrompt(FAILURE);
  expect(prompt).not.toContain('ignored()');
  expect(prompt).toContain(FAILURE.errorMessage);
  expect(prompt).toContain(FAILURE.pageUrl);
});

test('parses a fenced JSON array', () => {
  const parsed = parseSuggestions('```json\n[{"suggestedSelector":".a","confidence":"high","reasoning":"r"}]\n```');
  expect(parsed[0].suggestedSelector).toBe('.a');
});

test('wraps a single object in an array', () => {
  expect(parseSuggestions('{"suggestedSelector":".b","confidence":"low","reasoning":"r"}')).toHaveLength(1);
});

test('marks unparseable output as PARSE_ERROR', () => {
  expect(parseSuggestions('Sure! Try .c')[0].suggestedSelector).toBe('PARSE_ERROR');
});

test('createProvider picks the provider by name and rejects unknown names', () => {
  expect(createProvider('ollama').providerName).toBe('Ollama');
  expect(createProvider('Claude').providerName).toBe('Claude');
  expect(() => createProvider('mistral')).toThrow('Unknown AI_PROVIDER');
});
