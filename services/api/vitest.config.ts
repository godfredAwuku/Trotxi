import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      // *.pg.ts repositories and db/ scripts only run against a real Postgres;
      // the e2e suite (e2e/) exercises them. Unit coverage gates the logic layer.
      exclude: ['src/server.ts', 'src/db/**', 'src/**/*.routes.ts', 'src/**/*.pg.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
