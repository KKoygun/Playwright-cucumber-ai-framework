# Comparing with Playwright's official healer

Playwright 1.56+ ships a healer agent that runs inside an AI coding loop and edits test code. This page describes a manual run of it on the same broken selectors used by `npm run eval:healer`, so the two can be compared. It is not automated: the official healer is interactive and patches files, which does not fit a scripted CI job.

## What is compared

The nine cases in [`src/eval/cases.ts`](../src/eval/cases.ts): renamed class, removed test id, extra wrapper element and changed text. Each one breaks a selector that used to find exactly one element.

A case counts as healed only if the fixed locator finds **exactly the element the original selector found**. A test that turns green by asserting something weaker does not count.

## Setup

1. Make a scratch folder outside this repo and run `npm init playwright@latest` (Playwright 1.56 or newer).
2. Run `npx playwright init-agents --loop=claude` (or `--loop=vscode` / `--loop=opencode`).
3. For each case, add a spec that:
   - opens `https://demo.playwright.dev/todomvc`, adds `Buy milk`, `Walk the dog`, `Pay rent` and completes the first one (same as `setUpTodos`),
   - applies the case's mutation with `page.evaluate` (copy the body of `mutate`),
   - uses the original selector in an action whose effect can be checked, for example:

   ```ts
   test('new-todo-class', async ({ page }) => {
     // ...setup and mutation...
     await page.locator('.new-todo').fill('Healed');
     await page.locator('.new-todo').press('Enter');
     await expect(page.getByTestId('todo-title')).toHaveCount(4);
   });
   ```

4. Confirm every spec fails before the healer runs.

## Run

Ask the healer agent to fix one failing spec at a time. Do not edit the specs yourself while it runs.

## Checklist

- [ ] Playwright version and agent loop noted
- [ ] Model used by the agent loop noted
- [ ] All nine specs fail before healing
- [ ] For each case, recorded: healed or not, the final locator, number of agent turns, wall-clock time
- [ ] For each case, checked the patch only changed the locator (not the assertion or the setup)
- [ ] Noted any spec the healer marked as skipped instead of fixing
- [ ] Ran the same cases here: `npm run eval:record -- --providers=<name>` then `npm run eval:healer`
- [ ] Filled in the table below

## Results

_Not run yet._

| Case | Official healer | Final locator | Turns | This framework (provider) |
|---|---|---|---|---|
| | | | | |
