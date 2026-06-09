import { Pool } from 'pg';
import { buildApp } from './app';
import { loadDotenv } from './config/dotenv';
import { loadEnv } from './config/env';

loadDotenv();
import { InMemorySubscriptionRepository } from './modules/subscriptions/subscription.repository';
import { PgSubscriptionRepository } from './modules/subscriptions/subscription.repository.pg';
import { InMemoryUserRepository } from './modules/users/user.repository';
import { PgUserRepository } from './modules/users/user.repository.pg';
import { InMemoryRouteRepository } from './modules/routes/route.repository';
import { PgRouteRepository } from './modules/routes/route.repository.pg';
import { InMemoryTripRepository } from './modules/trips/trip.repository';
import { PgTripRepository } from './modules/trips/trip.repository.pg';
import { InMemoryBoardingRepository } from './modules/trips/boarding.repository';
import { PgBoardingRepository } from './modules/trips/boarding.repository.pg';
import type { AppDeps } from './app';

async function main(): Promise<void> {
  const env = loadEnv();

  let repos: Pick<AppDeps, 'users' | 'subscriptions' | 'routes' | 'trips' | 'boardings'>;
  let isReady: () => Promise<boolean> = async () => true;
  let pool: Pool | undefined;

  if (env.DATABASE_URL) {
    pool = new Pool({ connectionString: env.DATABASE_URL });
    repos = {
      users: new PgUserRepository(pool),
      subscriptions: new PgSubscriptionRepository(pool),
      routes: new PgRouteRepository(pool),
      trips: new PgTripRepository(pool),
      boardings: new PgBoardingRepository(pool),
    };
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
    repos = {
      users: new InMemoryUserRepository(),
      subscriptions: new InMemorySubscriptionRepository(),
      routes: new InMemoryRouteRepository(),
      trips: new InMemoryTripRepository(),
      boardings: new InMemoryBoardingRepository(),
    };
    console.log('Using in-memory repositories (no DATABASE_URL set)');
  }

  const app = await buildApp({
    ...repos,
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
