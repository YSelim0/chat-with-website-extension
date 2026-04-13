import { chromium, expect, test as base } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const extensionPath = join(__dirname, '..', '..', '.output', 'chrome-mv3');

type ExtensionFixtures = {
  contextPage: Awaited<ReturnType<typeof chromium.launchPersistentContext>>;
  extensionId: string;
  popupPage: Awaited<
    ReturnType<typeof chromium.launchPersistentContext>
  >['pages'][number];
};

export const test = base.extend<ExtensionFixtures>({
  contextPage: async ({ browserName: _browserName }, use) => {
    const userDataDir = mkdtempSync(
      join(tmpdir(), 'chat-with-website-extension-'),
    );
    const context = await chromium.launchPersistentContext(userDataDir, {
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
      headless: !!process.env.CI,
    });

    await use(context);
    await context.close();

    try {
      rmSync(userDataDir, { force: true, recursive: true });
    } catch {
      // Ignore Windows file-lock cleanup errors in E2E teardown.
    }
  },

  extensionId: async ({ contextPage }, use) => {
    let serviceWorker = contextPage.serviceWorkers()[0];

    for (let attempt = 0; attempt < 20 && !serviceWorker; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      serviceWorker = contextPage.serviceWorkers()[0];
    }

    if (!serviceWorker) {
      throw new Error(
        'The extension service worker did not become available in time.',
      );
    }

    const extensionId = new URL(serviceWorker.url()).host;
    await use(extensionId);
  },

  popupPage: async ({ contextPage, extensionId }, use) => {
    const popup = await contextPage.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await use(popup);
    await popup.close();
  },
});

export { expect };
