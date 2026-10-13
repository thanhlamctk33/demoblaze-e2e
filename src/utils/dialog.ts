import type { Page } from '@playwright/test';
import { config } from '../config';

/**
 * DemoBlaze reports most outcomes through native `window.alert()` dialogs.
 *
 * Playwright auto-dismisses dialogs when nobody listens, so we register a
 * one-shot listener *before* triggering the action, accept the dialog
 * immediately (an open alert blocks the page's JS), and hand back its text.
 *
 * Accepting inside the listener — rather than awaiting `waitForEvent` and the
 * click together — avoids a deadlock in browsers where the click does not
 * resolve until the alert is closed.
 */
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
