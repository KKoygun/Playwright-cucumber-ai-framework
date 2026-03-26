import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { TodoPage } from '../pages/TodoPage';

// ── Background ─────────────────────────────────────────────────────────────

Given('I am on the TodoMVC application', async function (this: CustomWorld) {
  // Navigation handled in the Before hook (src/support/hooks.ts)
});

// ── Given ──────────────────────────────────────────────────────────────────

Given('I have added a todo {string}', async function (this: CustomWorld, text: string) {
  const todoPage = new TodoPage(this.page);
  await todoPage.addTodo(text);
});

// ── When ───────────────────────────────────────────────────────────────────

When('I add a todo {string}', async function (this: CustomWorld, text: string) {
  const todoPage = new TodoPage(this.page);
  await todoPage.addTodo(text);
});

When('I complete todo number {int}', async function (this: CustomWorld, index: number) {
  const todoPage = new TodoPage(this.page);
  await todoPage.completeTodo(index - 1); // convert 1-based to 0-based
});

When('I delete todo number {int}', async function (this: CustomWorld, index: number) {
  const todoPage = new TodoPage(this.page);
  await todoPage.deleteTodo(index - 1);
});

When(
  'I filter todos by {string}',
  async function (this: CustomWorld, filter: 'All' | 'Active' | 'Completed') {
    const todoPage = new TodoPage(this.page);
    await todoPage.filterBy(filter);
  }
);

When('I clear completed todos', async function (this: CustomWorld) {
  const todoPage = new TodoPage(this.page);
  await todoPage.clearCompleted();
});

// ── Then ───────────────────────────────────────────────────────────────────

Then(
  'I should see {int} todo item',
  async function (this: CustomWorld, count: number) {
    const todoPage = new TodoPage(this.page);
    await expect(todoPage.todoItems).toHaveCount(count);
  }
);

Then(
  'I should see {int} todo items',
  async function (this: CustomWorld, count: number) {
    const todoPage = new TodoPage(this.page);
    await expect(todoPage.todoItems).toHaveCount(count);
  }
);

Then(
  'the todo {string} should be visible',
  async function (this: CustomWorld, text: string) {
    const todoPage = new TodoPage(this.page);
    const firstTodo = todoPage.todoItems.first().locator('label');
    await expect(firstTodo).toHaveText(text);
  }
);

Then(
  'todo number {int} should be marked as completed',
  async function (this: CustomWorld, index: number) {
    const todoPage = new TodoPage(this.page);
    const isCompleted = await todoPage.isTodoCompleted(index - 1);
    expect(isCompleted).toBe(true);
  }
);

Then(
  'todo number {int} should not be marked as completed',
  async function (this: CustomWorld, index: number) {
    const todoPage = new TodoPage(this.page);
    const isCompleted = await todoPage.isTodoCompleted(index - 1);
    expect(isCompleted).toBe(false);
  }
);
