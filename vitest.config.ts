import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 90_000,
    coverage: { enabled: false },
    server: {
      deps: {
        inline: [/colyseus/, /@colyseus/],
      },
    },
  },
});

