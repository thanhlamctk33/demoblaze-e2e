import { rmSync } from 'node:fs';
import type { Reporter } from '@playwright/test/reporter';

export default class CleanDirReporter implements Reporter {
  constructor(private readonly options: { dir: string }) {}

  onBegin(): void {
    rmSync(this.options.dir, { recursive: true, force: true });
  }

  printsToStdio(): boolean {
    return false;
  }
}
