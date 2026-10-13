import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { config } from './src/config';

const ALLURE_RESULTS_DIR = 'reports/allure-results';

const reporters: ReporterDescription[] = [
  [process.env.GITHUB_ACTIONS ? 'github' : 'list'],
  ['html', { outputFolder: 'reports/html', open: 'never' }],
  ['json', { outputFile: 'reports/json/results.json' }],
  ['./src/reporters/clean-dir.ts', { dir: ALLURE_RESULTS_DIR }],
  ['allure-playwright', { resultsDir: ALLURE_RESULTS_DIR, detail: true, suiteTitle: true }],
];
if (config.isCI) reporters.push(['blob', { outputDir: 'reports/blob' }]);

export default defineConfig({
  testDir: './tests',
  outputDir: 'reports/test-results',
  fullyParallel: true,
  forbidOnly: config.isCI,
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
      dependencies: ['api', 'chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
