import { defineConfig } from 'vitest/config';

// On simule une URI pour tous les tests qui chargent le dossier 'database'
process.env.MONGODB_URI = 'mongodb://localhost:27017/ilot_test';

export default defineConfig({
  test: {
    testTimeout: 10000, // 👈 10 secondes par défaut pour tous les tests
    setupFiles: ['./vitest.setup.ts'],
    globals: true, 
    environment: 'node',
    // 🩸 LE BOUCLIER : On exclut le dossier Playwright des tests unitaires
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'], 
  },
});
