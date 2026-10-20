import { Page, Locator } from '@playwright/test';
import { HealingLocator } from '../utils/HealingLocator';

const ITEM = '.todo-list li';

/**
 * TodoPage — Page Object Model for https://demo.playwright.dev/todomvc
 *
 * Encapsulates all element locators and interactions for the TodoMVC app.
 * Step definitions consume this class; raw Playwright calls never appear
 * in step files, which keeps the BDD layer readable and maintainable.
 *
 * Actions go through HealingLocator so HEAL_MODE=apply can heal them in place;
 * the Locator fields below are for assertions.
 */
export class TodoPage {
  readonly page: Page;
  private readonly healing: HealingLocator;

  // ── Locators ───────────────────────────────────────────────────────────────
  readonly newTodoInput: Locator;
  readonly todoItems: Locator;
  readonly todoCount: Locator;
  readonly clearCompletedButton: Locator;
  readonly filterLinks: Locator;

  constructor(page: Page, healing = new HealingLocator(page)) {
    this.page = page;
    this.healing = healing;
    this.newTodoInput = page.locator('.new-todo');
    this.todoItems = page.locator(ITEM);
    this.todoCount = page.locator('.todo-count');
    this.clearCompletedButton = page.locator('.clear-completed');
    this.filterLinks = page.locator('.filters a');
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async addTodo(text: string): Promise<void> {
    await this.healing.fill('.new-todo', text);
    await this.healing.press('.new-todo', 'Enter');
  }

  async completeTodo(index: number): Promise<void> {
    await this.healing.click(`${ITEM} >> nth=${index} >> .toggle`);
  }

  async deleteTodo(index: number): Promise<void> {
    // The destroy button only shows on hover
    await this.healing.hover(`${ITEM} >> nth=${index}`);
    await this.healing.click(`${ITEM} >> nth=${index} >> .destroy`);
  }

  async clearCompleted(): Promise<void> {
    await this.healing.click('.clear-completed');
  }

  async filterBy(filter: 'All' | 'Active' | 'Completed'): Promise<void> {
    await this.healing.click(`.filters a:text-is("${filter}")`);
  }

  async editTodo(index: number, newText: string): Promise<void> {
    await this.healing.dblclick(`${ITEM} >> nth=${index} >> label`);
    const editInput = `${ITEM} >> nth=${index} >> .edit`;
    await this.healing.fill(editInput, newText);
    await this.healing.press(editInput, 'Enter');
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  async getTodoText(index: number): Promise<string> {
    return (await this.todoItems.nth(index).locator('label').textContent()) ?? '';
  }

  async getTodoCount(): Promise<number> {
    return await this.todoItems.count();
  }

  async isTodoCompleted(index: number): Promise<boolean> {
    const classes = (await this.todoItems.nth(index).getAttribute('class')) ?? '';
    return classes.includes('completed');
  }

  async getRemainingCount(): Promise<string> {
    return (await this.todoCount.textContent()) ?? '';
  }
}
