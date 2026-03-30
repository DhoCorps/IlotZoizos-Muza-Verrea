import { vi } from 'vitest';
import { defineConfig } from 'vitest/config';

// On simule une URI pour tous les tests qui chargent le dossier 'database'
process.env.MONGODB_URI = 'mongodb://localhost:27017/ilot_test';

export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
    globals: true, // Si tu veux éviter d'importer 'describe', 'it' à chaque fois
    environment: 'node',
    },
});