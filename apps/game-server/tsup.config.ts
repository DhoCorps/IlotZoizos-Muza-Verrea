import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server/server.ts'],
  format: ['esm'],
  clean: true,
  external: ['cors', 'redis', '@sentry/node', '@socket.io/redis-adapter', 'socket.io', 'mongoose'],
});