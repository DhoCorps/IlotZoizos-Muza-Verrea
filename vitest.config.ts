import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // 🛡️ On sépare les tests unitaires du bruit des tests E2E
    exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**'],
    alias: {
      // ✅ SUTURE : Unicité de l'instance React
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      // 🌿 On pointe vers la racine pour respecter les imports incluant déjà "src"
      '@ilot/shared-core': path.resolve(__dirname, 'packages/shared-core'),
      '@ilot/infrastructure': path.resolve(__dirname, 'packages/infrastructure'),
      '@ilot/types': path.resolve(__dirname, 'packages/types'),
    },
    testTimeout: 15000,
  },
});