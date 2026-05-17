// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const STORAGE_STATE = path.join(__dirname, 'apps', 'hub-central', 'playwright', '.auth', 'user.json');

export default defineConfig({
  testDir: './apps/hub-central/e2e',

  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/__tests__/**', 
    '**/*.test.ts'
  ],

  // 🛡️ SUTURE : Patience du Nexus accrue (60s) pour éviter les Timeouts
  timeout: 60 * 1000,
  
  expect: {
    timeout: 10000 // On donne 10s pour trouver un élément graphique
  },

  fullyParallel: false, // On désactive le parallèle total pour stabiliser le serveur dev
  
  // 🛡️ SUTURE : On limite à 2 workers pour ne pas étouffer la machine
  workers: 2, 

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  globalSetup: require.resolve('./apps/hub-central/playwright/global-setup'),

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    storageState: STORAGE_STATE, 
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],

  webServer: {
    command: 'npx next dev apps/hub-central', 
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});