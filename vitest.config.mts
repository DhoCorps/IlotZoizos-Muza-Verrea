import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    // 🪄 Magie : Résout les alias de base comme @/* pour hub-central
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      // 🛡️ SUTURE MANUELLE : On force Vitest à pointer sur les fichiers index.ts des packages
      '@ilot/infrastructure': resolve(__dirname, './packages/infrastructure/src/index.ts'),
      '@ilot/types': resolve(__dirname, './packages/types/src/index.ts'),
      '@ilot/shared-core': resolve(__dirname, './packages/shared-core/src/index.ts'),
    }
  },
  test: {
    globals: true,
    
    // 🧠 L'intelligence du monorepo hybride
    environmentMatchGlobs: [
      ['apps/hub-central/**/*.test.{ts,tsx}', 'jsdom'],
      ['packages/**/*.test.ts', 'node'],
      ['apps/game-server/**/*.test.ts', 'node'],
    ],
    
    environment: 'node', 
    exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**', '**/.next/**'],
    testTimeout: 15000,
  },
});