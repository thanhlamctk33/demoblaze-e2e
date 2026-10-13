import type { Dialog, Page } from '@playwright/test';
import { config } from '../config';

const acceptQuietly = (dialog: Dialog) => void dialog.accept().catch(() => undefined);

export function acceptAllDialogs(page: Page): () => void {
  page.on('dialog', acceptQuietly);
  return () => page.off('dialog', acceptQuietly);
}

export async function captureAlert(
  page: Page,
  trigger: () => Promise<unknown>,
  timeout: number = config.timeouts.dialog,
): Promise<string> {
  let onDialog: ((dialog: Dialog) => void) | undefined;

  const message = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (onDialog) page.off('dialog', onDialog);
      reject(new Error(`Expected a browser alert within ${timeout}ms, but none appeared.`));
    }, timeout);

    onDialog = (dialog) => {
      clearTimeout(timer);
      acceptQuietly(dialog);
      resolve(dialog.message());
    };
    page.once('dialog', onDialog);
  });

  await trigger();
  return message;
}
