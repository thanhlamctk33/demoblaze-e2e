import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { config } from './src/config';

const reporters: ReporterDescription[] = [
  [config.isCI ? 'github' : 'list'],
  ['html', { outputFolder: 'reports/html', open: 'never' }],
  ['junit', { outputFile: 'reports/junit/results.xml' }],
  ['json', { outputFile: 'reports/json/results.json' }],
  ['allure-playwright', { resultsDir: 'reports/allure-results', detail: true, suiteTitle: true }],
];
// Blob reports let CI merge results from parallel jobs/shards into one HTML report.
if (config.isCI) reporters.push(['blob', { outputDir: 'reports/blob' }]);

/**
 * Projects
 *  - api            : backend tests, no browser
 *  - chromium/firefox/webkit : full UI suite on desktop engines
 *  - mobile-chrome/mobile-safari : @smoke UI subset on emulated devices
 *  - perf           : page-load / API latency budgets (Chromium only, needs Navigation Timing)
 *
 * Select with `--project`, filter by tag with `--grep @smoke` / `--grep-invert @known-bug`.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: config.isCI,
  // DemoBlaze is a shared public demo; retries in CI absorb its occasional
  // latency spikes. Tests that only pass on retry are reported as "flaky".
  retries: config.isCI ? 2 : 0,
  workers: config.isCI ? 2 : undefined,
  timeout: config.timeouts.test,
  expect: { timeout: config.timeouts.expect },
  reporter: reporters,

  use: {
    baseURL: config.baseURL,
    headless: config.headless,
    actionTimeout: config.timeouts.action,
    navigationTimeout: config.timeouts.navigation,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: config.apiURL },
    },
    {
      name: 'chromium',
      testDir: './tests/ui',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testDir: './tests/ui',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testDir: './tests/ui',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      testDir: './tests/ui',
      grep: /@smoke/,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      testDir: './tests/ui',
      grep: /@smoke/,
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'perf',
      testDir: './tests/perf',
      retries: 0,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
