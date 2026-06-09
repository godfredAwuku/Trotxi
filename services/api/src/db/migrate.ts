import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { requireDatabaseUrl } from '../config/dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

async function migrate(): Promise<void> {
  const pool = new Pool({ connectionString: requireDatabaseUrl() });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const { rows } = await pool.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
    if (rows.length > 0) {
      console.log(`✓ ${file} (already applied)`);
      continue;
    }
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await pool.query('COMMIT');
      console.log(`✓ ${file} (applied)`);
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
  }

  await pool.end();
  console.log('Migrations complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
