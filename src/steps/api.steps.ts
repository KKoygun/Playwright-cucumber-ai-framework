import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

// ── Request steps ──────────────────────────────────────────────────────────

When('I send a GET request to {string}', async function (this: CustomWorld, path: string) {
  const response = await this.apiRequest.get(path);
  this.lastApiResponse = {
    status: response.status(),
    body: await response.json(),
  };
});

When(
  'I send a POST request to {string} with body:',
  async function (this: CustomWorld, path: string, body: string) {
    const response = await this.apiRequest.post(path, { data: JSON.parse(body) });
    this.lastApiResponse = {
      status: response.status(),
      body: await response.json(),
    };
  }
);

// ── Response assertion steps ──────────────────────────────────────────────

Then('the response status should be {int}', function (this: CustomWorld, expectedStatus: number) {
  expect(this.lastApiResponse.status).toBe(expectedStatus);
});

Then(
  'the response should have field {string}',
  function (this: CustomWorld, field: string) {
    const body = this.lastApiResponse.body as Record<string, unknown>;
    expect(body).toHaveProperty(field);
  }
);

Then(
  'the response field {string} should equal {string}',
  function (this: CustomWorld, field: string, expectedValue: string) {
    const body = this.lastApiResponse.body as Record<string, unknown>;
    expect(String(body[field])).toBe(expectedValue);
  }
);

Then('the response should contain {int} items', function (this: CustomWorld, count: number) {
  const body = this.lastApiResponse.body;
  expect(Array.isArray(body)).toBeTruthy();
  expect((body as unknown[]).length).toBe(count);
});
