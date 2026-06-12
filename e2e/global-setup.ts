import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { Client } from 'pg';
import { E2E_DATABASE_URL } from './env';

const API_DIR = join(__dirname, '..', 'services', 'api');

/** Recreate the e2e database from scratch, then migrate + seed it. */
export default async function globalSetup(): Promise<void> {
  const target = new URL(E2E_DATABASE_URL);
  const dbName = target.pathname.slice(1);
  if (!/^[a-z0-9_]+$/.test(dbName)) {
    throw new Error(`Unsafe e2e database name: ${dbName}`);
  }

  const adminUrl = new URL(E2E_DATABASE_URL);
  adminUrl.pathname = '/postgres';
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${dbName}`);
  } finally {
    await admin.end();
  }

  const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL };
  execSync('npm run migrate', { cwd: API_DIR, env, stdio: 'inherit' });
  execSync('npm run seed', { cwd: API_DIR, env, stdio: 'inherit' });
}
