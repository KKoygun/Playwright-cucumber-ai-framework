export interface RecordedCall {
  url: string;
  headers: Headers;
  body: Record<string, unknown>;
}

/** A fetch stand-in that records each request and answers with a fixed JSON body. */
export function fakeFetch(responseBody: unknown, status = 200) {
  const calls: RecordedCall[] = [];

  const fn = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: init?.body ? JSON.parse(String(init.body)) : {},
    });
    return new Response(JSON.stringify(responseBody), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };

  return { fetch: fn as typeof fetch, calls };
}

export const SUGGESTION_JSON = JSON.stringify([
  { suggestedSelector: '[data-testid="todo-title"]', confidence: 'high', reasoning: 'stable test id' },
]);

export const FAILURE = {
  scenarioName: 'Add a single todo item',
  errorMessage: "locator.fill: Timeout 5000ms exceeded. waiting for locator('.new-todo-x')",
  pageHtml: '<input class="new-todo"><script>ignored()</script>',
  pageUrl: 'https://demo.playwright.dev/todomvc/#/',
};
