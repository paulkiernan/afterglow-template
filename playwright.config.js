import { defineConfig, devices } from '@playwright/test';

// The demo dev server, on a port of its own so a developer's `npm run dev`
// never collides with a test run.
const PORT = 5182;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.js/,
  // One worker: every test drives a software-WebGL context, and running them
  // side by side only multiplies GPU contexts (and flakiness).
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: Boolean(process.env.CI),
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    launchOptions: {
      // Headless Chromium has no GPU. Pin ANGLE to SwiftShader and allow the
      // software fallback explicitly, so the suite always gets a real WebGL
      // context instead of quietly degrading or skipping.
      args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    // Reuse a dev server the developer already has running locally; CI must
    // own the exact process it tests.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
