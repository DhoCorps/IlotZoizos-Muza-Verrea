import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server/server.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  bundle: true,
  external: [
    'express',
    'socket.io',
    'mongoose',
    'redis',
    'ioredis',
    'body-parser',
    'cors',
    '@sentry/node',
    '@sentry/profiling-node'
    // ⚠️ On a retiré @ilot/shared-core d'ici pour qu'il soit bundlé !
  ],
});