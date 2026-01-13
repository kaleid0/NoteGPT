import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  use: {
    baseURL: process.env.PW_BASE_URL || 'http://localhost:3000',
    headless: true,
    actionTimeout: 60000,
  },
  webServer: {
    command: 'npm --prefix client run dev -- --host',
    url: 'http://localhost:3000',
    timeout: 120000,
    reuseExistingServer: true,
  },
})
