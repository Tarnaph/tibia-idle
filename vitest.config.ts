import { defineConfig } from 'vitest/config';

export default defineConfig({
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

