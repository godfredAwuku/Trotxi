// Shared constants for the e2e harness (imported by playwright.config and global-setup).

export const PORT = Number(process.env.E2E_PORT ?? 3100);

// Dedicated database so test runs never touch local dev data. The harness
// drops and recreates it on every run, then applies migrations + seed.
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://trotxi:trotxi@localhost:5432/trotxi_e2e';

export const BASE_URL = `http://127.0.0.1:${PORT}`;
