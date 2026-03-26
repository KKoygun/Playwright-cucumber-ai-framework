import { Page, Locator } from '@playwright/test';

/**
 * TodoPage — Page Object Model for https://demo.playwright.dev/todomvc
 *
 * Encapsulates all element locators and interactions for the TodoMVC app.
 * Step definitions consume this class; raw Playwright calls never appear
 * in step files, which keeps the BDD layer readable and maintainable.
 */
export class TodoPage {
  readonly page: Page;

  // ── Locators ───────────────────────────────────────────────────────────────
  readonly newTodoInput: Locator;
  readonly todoItems: Locator;
  readonly todoCount: Locator;
  readonly clearCompletedButton: Locator;
  readonly filterLinks: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newTodoInput = page.locator('.new-todo');
    this.todoItems = page.locator('.todo-list li');
    this.todoCount = page.locator('.todo-count');
    this.clearCompletedButton = page.locator('.clear-completed');
    this.filterLinks = page.locator('.filters a');
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async addTodo(text: string): Promise<void> {
    await this.newTodoInput.fill(text);
    await this.newTodoInput.press('Enter');
  }

  async completeTodo(index: number): Promise<void> {
    await this.todoItems.nth(index).locator('.toggle').click();
  }

  async deleteTodo(index: number): Promise<void> {
    await this.todoItems.nth(index).hover();
    await this.todoItems.nth(index).locator('.destroy').click();
  }

  async clearCompleted(): Promise<void> {
    await this.clearCompletedButton.click();
  }

  async filterBy(filter: 'All' | 'Active' | 'Completed'): Promise<void> {
    await this.filterLinks.filter({ hasText: filter }).click();
  }

  async editTodo(index: number, newText: string): Promise<void> {
    await this.todoItems.nth(index).locator('label').dblclick();
    const editInput = this.todoItems.nth(index).locator('.edit');
    await editInput.clear();
    await editInput.fill(newText);
    await editInput.press('Enter');
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
