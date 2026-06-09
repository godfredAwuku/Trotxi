import { existsSync } from 'node:fs';
import { Pool } from 'pg';
import { buildApp } from './app';
import { loadEnv } from './config/env';

// Load a local .env if present (Node 20.12+ / 22 built-in). Production injects
// env vars directly, so a missing .env is fine.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}
import { InMemorySubscriptionRepository } from './modules/subscriptions/subscription.repository';
import { InMemoryUserRepository } from './modules/users/user.repository';
import { PgUserRepository } from './modules/users/user.repository.pg';
import type { UserRepository } from './modules/users/user.repository';
import type { SubscriptionRepository } from './modules/subscriptions/subscription.repository';

async function main(): Promise<void> {
  const env = loadEnv();

  let users: UserRepository;
  const subscriptions: SubscriptionRepository = new InMemorySubscriptionRepository();
  let isReady: () => Promise<boolean> = async () => true;
  let pool: Pool | undefined;

  if (env.DATABASE_URL) {
    pool = new Pool({ connectionString: env.DATABASE_URL });
    users = new PgUserRepository(pool);
    isReady = async () => {
      try {
        await pool!.query('SELECT 1');
        return true;
      } catch {
        return false;
      }
    };
    console.log('Using Postgres repositories');
  } else {
    users = new InMemoryUserRepository();
    console.log('Using in-memory repositories (no DATABASE_URL set)');
  }

  const app = await buildApp({
    users,
    subscriptions,
    jwt: { secret: env.JWT_SECRET, expiresIn: env.JWT_EXPIRES_IN },
    isReady,
    logger: true,
  });

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Received ${signal}, shutting down`);
    await app.close();
    await pool?.end();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`Trotxi API listening on http://${env.HOST}:${env.PORT} — docs at /docs`);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
