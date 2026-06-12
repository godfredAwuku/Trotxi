import { defineConfig } from '@playwright/test';
import { BASE_URL, E2E_DATABASE_URL, PORT } from './env';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
  },
  globalSetup: './global-setup.ts',
  webServer: {
    command: 'npx tsx src/server.ts',
    cwd: '../services/api',
    url: `${BASE_URL}/healthz`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      PORT: String(PORT),
      HOST: '127.0.0.1',
      // Overrides services/api/.env: loadEnvFile never clobbers pre-set vars.
      DATABASE_URL: E2E_DATABASE_URL,
      JWT_SECRET: 'e2e-only-secret-0123456789-0123456789',
      JWT_EXPIRES_IN: '1h',
      NODE_ENV: 'test',
    },
  },
});
