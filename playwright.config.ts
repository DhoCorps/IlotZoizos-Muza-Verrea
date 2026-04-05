import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// 🌟 LA CLEF : On définit le chemin vers le Passe-Partout
const STORAGE_STATE = path.join(__dirname, 'apps', 'hub-central', 'playwright', '.auth', 'user.json');

/**
 * Configuration de l'Îlot Zoizos pour Playwright
 * Ce fichier orchestre les tests de bout en bout (E2E).
 */
export default defineConfig({
  // 🎯 Localisation de tes oiseaux de test (tes fichiers .spec.ts)
  testDir: './apps/hub-central/e2e',

  /* 🛡️ LE BOUCLIER D'EXCLUSION : 
     On interdit à Playwright de toucher aux dossiers de Vitest
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

  // 🌟 NOUVEAU : Le script qui forge le Passe-Partout avant tout le monde
  globalSetup: require.resolve('./apps/hub-central/playwright/global-setup'),

  // 🌟 L'UNIQUE BLOC 'use' POUR LES TESTS
  use: {
    // 🌐 L'URL de ton serveur de dev local
    baseURL: 'http://localhost:3000',
    // Capture une trace en cas d'échec
    trace: 'on-first-retry',
    // Capture un screenshot si ça rate
    screenshot: 'only-on-failure',
    // 🌟 INJECTION DU COOKIE POUR TOUS LES TESTS
    storageState: STORAGE_STATE, 
  },

  /* 🎭 LES NAVIGATEURS (Les différentes espèces d'oiseaux) */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome', // 👈 Indispensable sur Windows pour utiliser ton vrai Chrome
      },
    },
  ],

  /* 🚀 LE SERVEUR AUTOMATIQUE
     Playwright lancera 'pnpm dev' tout seul et l'éteindra à la fin.
  */
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});