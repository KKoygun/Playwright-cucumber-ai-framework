import { Page } from '@playwright/test';

export const EVAL_URL = 'https://demo.playwright.dev/todomvc';

export type Mutation = 'renamed-class' | 'removed-test-id' | 'extra-wrapper' | 'changed-text';

export interface EvalCase {
  id: string;
  mutation: Mutation;
  /** Works before the mutation; a healed selector must find this same element afterwards. */
  selector: string;
  /**
   * Runs in the browser with the target element. It must keep the element itself
   * (no replacing it), and must be self-contained because it is serialised to the page.
   */
  mutate: (el: Element) => void;
}

// Class renames and test-id removals are applied page-wide, the way a real refactor would.
export const CASES: EvalCase[] = [
  {
    id: 'new-todo-class',
    mutation: 'renamed-class',
    selector: '.new-todo',
    mutate: (el) => el.ownerDocument.querySelectorAll('.new-todo').forEach((e) => e.classList.replace('new-todo', 'todo-input')),
  },
  {
    id: 'toggle-class',
    mutation: 'renamed-class',
    selector: '.todo-list li >> nth=1 >> .toggle',
    mutate: (el) => el.ownerDocument.querySelectorAll('.toggle').forEach((e) => e.classList.replace('toggle', 'todo-check')),
  },
  {
    id: 'clear-completed-class',
    mutation: 'renamed-class',
    selector: '.clear-completed',
    mutate: (el) => el.classList.replace('clear-completed', 'btn-clear'),
  },
  {
    id: 'todo-title-testid',
    mutation: 'removed-test-id',
    selector: '[data-testid="todo-title"] >> nth=2',
    mutate: (el) => el.ownerDocument.querySelectorAll('[data-testid="todo-title"]').forEach((e) => e.removeAttribute('data-testid')),
  },
  {
    id: 'todo-count-testid',
    mutation: 'removed-test-id',
    selector: '[data-testid="todo-count"]',
    mutate: (el) => el.removeAttribute('data-testid'),
  },
  {
    id: 'new-todo-wrapper',
    mutation: 'extra-wrapper',
    selector: '.header > .new-todo',
    mutate: (el) => {
      const wrapper = el.ownerDocument.createElement('div');
      el.replaceWith(wrapper);
      wrapper.appendChild(el);
    },
  },
  {
    id: 'clear-completed-wrapper',
    mutation: 'extra-wrapper',
    selector: '.footer > .clear-completed',
    mutate: (el) => {
      const wrapper = el.ownerDocument.createElement('div');
      el.replaceWith(wrapper);
      wrapper.appendChild(el);
    },
  },
  {
    id: 'active-filter-text',
    mutation: 'changed-text',
    selector: '.filters a:text-is("Active")',
    mutate: (el) => {
      el.textContent = 'Open';
    },
  },
  {
    id: 'clear-completed-text',
    mutation: 'changed-text',
    selector: 'button:text-is("Clear completed")',
    mutate: (el) => {
      el.textContent = 'Remove done';
    },
  },
];

/** Same starting state for every case: three todos, the first one completed. */
export async function setUpTodos(page: Page): Promise<void> {
  await page.goto(EVAL_URL);
  for (const text of ['Buy milk', 'Walk the dog', 'Pay rent']) {
    await page.locator('.new-todo').fill(text);
    await page.locator('.new-todo').press('Enter');
  }
  await page.locator('.todo-list li >> nth=0 >> .toggle').click();
}
