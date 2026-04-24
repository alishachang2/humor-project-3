import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './__tests__/e2e',
  use: { baseURL: 'http://localhost:3000' },
  projects: [
    // Auth setup — creates test user and saves session
    {
      name: 'auth-setup',
      testMatch: '**/auth-setup.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    // Unauthenticated tests — no auth needed, run independently
    {
      name: 'unauthenticated',
      testMatch: '**/unauth.test.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    // Authenticated tests — depend on auth-setup completing first
    {
      name: 'authenticated',
      testMatch: '**/auth.test.ts',
      dependencies: ['auth-setup'],
      teardown: 'auth-teardown',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth.json',
      },
    },
    // Teardown — deletes test user after authenticated tests
    {
      name: 'auth-teardown',
      testMatch: '**/auth-teardown.ts',
    },
  ],
  globalSetup: undefined,
  globalTeardown: undefined,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
