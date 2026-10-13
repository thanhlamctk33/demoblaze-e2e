import * as dotenv from 'dotenv';
import path from 'node:path';
import { environments, type EnvironmentConfig, type EnvironmentName } from './environments';

// Load .env (never committed) so every value below can be overridden locally or in CI.
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const num = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value !== '' && value !== undefined ? parsed : fallback;
};

const envName = (process.env.TEST_ENV ?? 'prod') as EnvironmentName;
const selected: EnvironmentConfig | undefined = environments[envName];
if (!selected) {
  throw new Error(`Unknown TEST_ENV "${envName}". Known environments: ${Object.keys(environments).join(', ')}`);
}

/**
 * Single source of truth for runtime configuration.
 * Precedence: explicit env var  >  environment catalogue  >  default.
 */
export const config = {
  env: envName,
  baseURL: process.env.BASE_URL ?? selected.baseURL,
  apiURL: process.env.API_URL ?? selected.apiURL,
  isCI: !!process.env.CI,
  headless: process.env.HEADLESS !== 'false',

  /**
   * Optional pre-existing account. When not provided, the framework signs up
   * a fresh, unique user per worker through the API (see fixtures).
   */
  credentials: {
    username: process.env.TEST_USERNAME,
    password: process.env.TEST_PASSWORD,
  },

  timeouts: {
    test: num(process.env.TEST_TIMEOUT, 60_000),
    expect: num(process.env.EXPECT_TIMEOUT, 10_000),
    action: num(process.env.ACTION_TIMEOUT, 15_000),
    navigation: num(process.env.NAVIGATION_TIMEOUT, 30_000),
    dialog: num(process.env.DIALOG_TIMEOUT, 10_000),
  },

  /** Performance budgets in milliseconds (tests/perf). Tune per environment. */
  perfBudgets: {
    pageLoad: num(process.env.PERF_PAGE_LOAD_MS, 5_000),
    productsRendered: num(process.env.PERF_PRODUCTS_RENDERED_MS, 6_000),
    apiResponse: num(process.env.PERF_API_RESPONSE_MS, 2_000),
  },
} as const;

export type FrameworkConfig = typeof config;
