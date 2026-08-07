import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server/server.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  bundle: true,
  // On indique à tsup de laisser Node.js gérer ces packages nativement au runtime
  external: [
    'express',
    'socket.io',
    'mongoose',
    'redis',
    'ioredis',
    'body-parser',
    'cors',
    '@sentry/node',
    '@sentry/profiling-node',
    '@ilot/shared-core'
  ],
});