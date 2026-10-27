import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const isCI = Boolean(process.env.CI)
/** Set E2E_BASE_URL to run the suites against a deployment (e.g. the Vercel URL) instead of a local build. */
const remoteBaseUrl = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: 'tests/e2e',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}-{platform}{ext}',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: remoteBaseUrl ?? `http://localhost:${PORT}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  // Tests run against the optimized demo build (production bundle + MSW), as evaluated.
  webServer: remoteBaseUrl
    ? undefined
    : {
        command: 'npm run build:demo && npm run preview',
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !isCI,
        timeout: 180_000,
      },
})
