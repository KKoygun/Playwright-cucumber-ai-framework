import { test, expect } from '@playwright/test';
import { CASES } from '../../src/eval/cases';
import { prepareCase, scoreSelector } from '../../src/eval/score';

const wrapperCase = CASES.find((c) => c.id === 'new-todo-wrapper')!;

test.beforeEach(async ({ page }) => {
  await page.setContent(`
    <header class="header"><input class="new-todo" placeholder="What needs to be done?"></header>
    <input class="search">
  `);
});

test('a case is valid when the mutation breaks the original selector', async ({ page }) => {
  const prepared = await prepareCase(page, wrapperCase);

  expect(prepared.valid).toBe(true);
  expect(prepared.errorMessage).toContain('.header > .new-todo');
});

test('a case is skipped when the original selector does not match exactly one element', async ({ page }) => {
  const prepared = await prepareCase(page, { ...wrapperCase, selector: 'input' });
  expect(prepared).toMatchObject({ valid: false });
});

test('scores by element identity, not by selector text', async ({ page }) => {
  await prepareCase(page, wrapperCase);

  expect(await scoreSelector(page, '.header .new-todo')).toBe('healed');
  expect(await scoreSelector(page, 'input[placeholder="What needs to be done?"]')).toBe('healed');
  expect(await scoreSelector(page, '.search')).toBe('not_healed');
  expect(await scoreSelector(page, 'input')).toBe('not_healed');
  expect(await scoreSelector(page, 'input[[[')).toBe('invalid_suggestion');
  expect(await scoreSelector(page, 'PARSE_ERROR')).toBe('invalid_suggestion');
});
