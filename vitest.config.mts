import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    // 🪄 Résout les alias du tsconfig
    tsconfigPaths(),
  ] as any, // 👈 Neutralise définitivement le conflit de types entre Vite et Vitest
  
  resolve: {
    alias: {
      // 🛡️ SUTURE MONOREPO : Pointage direct vers les sources des packages
      '@ilot/infrastructure': resolve(process.cwd(), 'packages/infrastructure/src/index.ts'),
      '@ilot/types': resolve(process.cwd(), 'packages/types/src/index.ts'),
      '@ilot/shared-core': resolve(process.cwd(), 'packages/shared-core/src/index.ts'),
    },
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
    
    clearMocks: true,
    restoreMocks: true,
  },
});