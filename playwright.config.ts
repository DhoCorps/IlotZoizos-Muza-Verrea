import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration de l'Îlot Zoizos pour Playwright
 * Ce fichier orchestre les tests de bout en bout (E2E).
 */
export default defineConfig({
  // 🎯 Localisation de tes oiseaux de test (tes fichiers .spec.ts)
  testDir: './apps/hub-central/e2e',

  /* 🛡️ LE BOUCLIER D'EXCLUSION : 
     On interdit à Playwright de toucher aux dossiers de Vitest (__tests__)
  */
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/__tests__/**', 
    '**/*.test.ts'
  ],

  // Temps maximum pour un test (30 secondes)
  timeout: 30 * 1000,
  
  expect: {
    timeout: 5000
  },

  // On lance les tests en parallèle pour gagner du temps
  fullyParallel: true,

  // Échoue sur la CI si tu as oublié un .only dans ton code
  forbidOnly: !!process.env.CI,

  // Nombre de tentatives en cas d'échec (0 en local, 2 sur le serveur de build)
  retries: process.env.CI ? 2 : 0,

  // Rapporteur de résultats : "list" pour la console, "html" pour la preuve visuelle
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    // 🌐 L'URL de ton serveur de dev local
    baseURL: 'http://localhost:3000',

    // Capture une trace en cas d'échec (génial pour ta soutenance !)
    trace: 'on-first-retry',
    
    // Capture une vidéo ou screenshot si ça rate
    screenshot: 'only-on-failure',
  },

  /* 🎭 LES NAVIGATEURS (Les différentes espèces d'oiseaux) */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    /* Tu peux décommenter Firefox ou Safari si besoin
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    */
  ],

  /* 🚀 LE SERVEUR AUTOMATIQUE (Optionnel)
     Si tu veux que Playwright lance 'pnpm dev' tout seul, décommente ça :
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  */
});