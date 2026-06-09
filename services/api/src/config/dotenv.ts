import { existsSync } from 'node:fs';

// Load a local .env if present (Node 20.12+ / 22 built-in). Production injects
// env vars directly, so a missing .env is fine.
export function loadDotenv(path = '.env'): void {
  if (existsSync(path)) {
    process.loadEnvFile(path);
  }
}

// DB scripts (migrate/seed) only need the connection string, not the full app env.
export function requireDatabaseUrl(): string {
  loadDotenv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required (set it in services/api/.env or the environment)');
  }
  return url;
}
