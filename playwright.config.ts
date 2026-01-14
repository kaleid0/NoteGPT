import { defineConfig } from '@playwright/test'

const config = {
  workers: 1,
  testDir: 'tests/e2e',
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' },
    },
  ],
  use: {
    baseURL: process.env.PW_BASE_URL || 'http://localhost:3000',
    headless: true,
    actionTimeout: 60000,
    navigationTimeout: 90000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // In CI with PW_BASE_URL set, servers are started externally; skip webServer
  webServer: process.env.PW_BASE_URL
    ? undefined
    : process.env.CI
    ? {
        command: 'npm --prefix client run build && npm --prefix client run preview -- --port 3000',
        url: 'http://localhost:3000',
        timeout: 180000,
        reuseExistingServer: true,
      }
    : {
        command: 'npm --prefix client run dev -- --host 0.0.0.0',
        url: 'http://localhost:3000',
        timeout: 120000,
        reuseExistingServer: false,
      },
}

// Add global setup/teardown only if not in CI or with custom baseURL
if (!process.env.PW_BASE_URL && !process.env.CI) {
  ;(config as any).globalSetup = './tests/e2e/global-setup.ts'
  ;(config as any).globalTeardown = './tests/e2e/global-teardown.ts'
}

export default defineConfig(config)
