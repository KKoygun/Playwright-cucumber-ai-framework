import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import {
  Browser,
  BrowserContext,
  Page,
  chromium,
  request as playwrightRequest,
  APIRequestContext,
} from '@playwright/test';
import { HealerAgent } from '../agents/HealerAgent';
import { GroqProvider } from '../agents/providers/GroqProvider';
import * as dotenv from 'dotenv';

dotenv.config();

export interface WorldParameters {
  headless?: boolean;
}

/**
 * CustomWorld — the shared context injected into every Cucumber step.
 *
 * Supports two test modes:
 *  - Browser tests: init() launches Chromium + sets up the Healer agent
 *  - API tests:     initApi() creates a Playwright APIRequestContext (no browser)
 *
 * Design decision: We instantiate the AI provider here rather than in the
 * agent, so the provider can be swapped by changing a single line — the
 * rest of the framework remains untouched (Open/Closed Principle).
 */
export class CustomWorld extends World<WorldParameters> {
  // ── Browser context (UI tests) ──────────────────────────────────────────
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  healer!: HealerAgent;

  // ── API context (API tests) ─────────────────────────────────────────────
  apiRequest!: APIRequestContext;
  lastApiResponse!: { status: number; body: unknown };

  constructor(options: IWorldOptions<WorldParameters>) {
    super(options);
  }

  /** Initialise browser + healer for UI test scenarios. */
  async init(): Promise<void> {
    const headless = process.env.HEADLESS !== 'false';

    this.browser = await chromium.launch({ headless });
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    this.page = await this.context.newPage();

    // ── Swap provider here to switch AI backends ──────────────────────────
    const apiKey = process.env.GROQ_API_KEY ?? '';
    const provider = new GroqProvider(apiKey);
    this.healer = new HealerAgent(provider);
  }

  /** Initialise API request context for @api test scenarios (no browser). */
  async initApi(): Promise<void> {
    this.apiRequest = await playwrightRequest.newContext({
      baseURL: 'https://jsonplaceholder.typicode.com',
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
    });
  }

  async cleanup(): Promise<void> {
    await this.page?.close();
    await this.context?.close();
    await this.browser?.close();
  }

  async cleanupApi(): Promise<void> {
    await this.apiRequest?.dispose();
  }
}

setWorldConstructor(CustomWorld);
