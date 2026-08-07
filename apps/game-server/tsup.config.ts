import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server/server.ts'],
  format: ['esm'],
  clean: true,
  // 🛡️ INDISPENSABLE : On dit à tsup de ne pas essayer d'inclure ces modules dans le fichier unique
  external: [
    'cors',
    'redis',
    '@sentry/node',
    '@sentry/node-cpu-profiler',
    '@sentry/profiling-node',
    '@socket.io/redis-adapter',
    'socket.io',
    'mongoose'
  ],
});