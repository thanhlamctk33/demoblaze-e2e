import { test, expect } from '../../src/fixtures';
import { config } from '../../src/config';

/**
 * Lightweight performance checks (browser-side Web Performance APIs + API latency).
 * Budgets come from config/env (PERF_*), so each environment can set its own.
 * For load/stress testing see perf/k6/ (k6 script, run separately).
 *
 * Results are attached to the report as JSON so trends can be tracked over time.
 */
test.describe('Performance budgets', { tag: '@perf' }, () => {
  test('[TC-PERF-001] home page loads and renders products within budget', async ({ page, homePage }, testInfo) => {
    const start = Date.now();
    await page.goto('/');
    await homePage.waitUntilReady();
    const productsRenderedMs = Date.now() - start;

    const nav = await page.evaluate(() => {
      const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      return {
        ttfb: Math.round(entry.responseStart - entry.requestStart),
        domContentLoaded: Math.round(entry.domContentLoadedEventEnd - entry.startTime),
        load: Math.round(entry.loadEventEnd - entry.startTime),
      };
    });
    const metrics = { ...nav, productsRenderedMs };
    await testInfo.attach('home-page-metrics.json', {
      body: JSON.stringify(metrics, null, 2),
      contentType: 'application/json',
    });

    expect.soft(nav.load, 'window load event').toBeLessThan(config.perfBudgets.pageLoad);
    expect
      .soft(productsRenderedMs, 'time until product grid is visible')
      .toBeLessThan(config.perfBudgets.productsRendered);
  });

  test('[TC-PERF-002] product catalogue API responds within budget (p50 of 5 calls)', async ({ api }, testInfo) => {
    const durations: number[] = [];
    for (let i = 0; i < 5; i++) durations.push((await api.entries()).durationMs);
    const sorted = [...durations].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length / 2)];
    await testInfo.attach('entries-latency.json', {
      body: JSON.stringify({ durations, p50 }),
      contentType: 'application/json',
    });

    expect(p50).toBeLessThan(config.perfBudgets.apiResponse);
  });

  test('[TC-PERF-003] login API responds within budget', async ({ api, testUser }) => {
    const result = await api.login(testUser.username, testUser.password);

    expect(result.ok).toBe(true);
    expect(result.durationMs).toBeLessThan(config.perfBudgets.apiResponse);
  });
});
