import { defineConfig } from '@playwright/test';

const PORT = 8799;
/** Set BASE_URL to test a deployed site instead of a local production build. */
const remote = process.env.BASE_URL;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: remote ?? `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    // Set PW_CHANNEL=chrome to use an installed Chrome instead of Playwright's downloaded Chromium.
    channel: process.env.PW_CHANNEL,
  },
  // Locally, tests run against the production build: the bundled server serving the built client.
  webServer: remote
    ? undefined
    : {
        command: `npm run build && PORT=${PORT} npm start`,
        url: `http://localhost:${PORT}/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
