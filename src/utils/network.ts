import { expect, type Page } from '@playwright/test';

export interface RequestTracker {
  readonly sent: number;
  settled(): Promise<number>;
}

export function trackRequests(page: Page, path: string): RequestTracker {
  let sent = 0;
  let done = 0;
  const matches = (url: string) => new URL(url).pathname === path;
  page.on('request', (r) => {
    if (matches(r.url())) sent++;
  });
  const finish = (r: { url(): string }) => {
    if (matches(r.url())) done++;
  };
  page.on('requestfinished', finish);
  page.on('requestfailed', finish);
  return {
    get sent() {
      return sent;
    },
    async settled() {
      await expect.poll(() => sent > 0 && sent === done, { timeout: 15_000 }).toBe(true);
      return sent;
    },
  };
}
