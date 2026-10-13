import type { Page } from '@playwright/test';
import { config } from '../config';

export async function captureAlert(
  page: Page,
  trigger: () => Promise<unknown>,
  timeout: number = config.timeouts.dialog,
): Promise<string> {
  let onDialog: ((d: import('@playwright/test').Dialog) => void) | undefined;

  const message = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (onDialog) page.off('dialog', onDialog);
      reject(new Error(`Expected a browser alert within ${timeout}ms, but none appeared.`));
    }, timeout);

    onDialog = (dialog) => {
      clearTimeout(timer);
      const text = dialog.message();
      dialog.accept().catch(() => undefined);
      resolve(text);
    };
    page.once('dialog', onDialog);
  });

  await trigger();
  return message;
}
