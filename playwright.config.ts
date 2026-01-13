import { defineConfig } from '@playwright/test'

export default defineConfig({
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
  },
  webServer: process.env.CI ? {
    command: 'npm --prefix client run build && npm --prefix client run preview -- --port 3000',
    url: 'http://localhost:3000',
    timeout: 180000,
    reuseExistingServer: true,
  } : {
    command: 'npm --prefix client run dev -- --host',
    url: 'http://localhost:3000',
    timeout: 120000,
    reuseExistingServer: true,
  },
})
