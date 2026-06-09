import fastifyCors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyInstance } from 'fastify';
import { authGuard as makeAuthGuard } from './lib/auth.guard';
import { AppError } from './lib/errors';
import type { JwtConfig } from './lib/jwt';
import { authRoutes } from './modules/auth/auth.routes';
import { AuthService } from './modules/auth/auth.service';
import { healthRoutes } from './modules/health/health.routes';
import { subscriptionRoutes } from './modules/subscriptions/subscriptions.routes';
import { SubscriptionService } from './modules/subscriptions/subscription.service';
import type { SubscriptionRepository } from './modules/subscriptions/subscription.repository';
import type { RouteRepository } from './modules/routes/route.repository';
import { routeRoutes } from './modules/routes/routes.routes';
import type { TripRepository } from './modules/trips/trip.repository';
import type { BoardingRepository } from './modules/trips/boarding.repository';
import { BoardingService } from './modules/trips/boarding.service';
import { tripRoutes } from './modules/trips/trips.routes';
import { passRoutes } from './modules/pass/pass.routes';
import type { PaymentRepository } from './modules/payments/payment.repository';
import type { PaymentProvider } from './modules/payments/payment.provider';
import { PaymentService } from './modules/payments/payment.service';
import { paymentRoutes } from './modules/payments/payments.routes';
import type { UserRepository } from './modules/users/user.repository';
import { userRoutes } from './modules/users/users.routes';

export interface AppDeps {
  users: UserRepository;
  subscriptions: SubscriptionRepository;
  routes: RouteRepository;
  trips: TripRepository;
  boardings: BoardingRepository;
  payments: PaymentRepository;
  paymentProvider: PaymentProvider;
  jwt: JwtConfig;
  isReady?: () => Promise<boolean>;
  logger?: boolean;
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: deps.logger ?? false });

  // Treat an empty application/json body as {} so bodyless POSTs (e.g. boarding)
  // don't fail when a client still sends Content-Type: application/json.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req, body, done) => {
      const text = (body as string).trim();
      if (text.length === 0) {
        done(null, {});
        return;
      }
      try {
        done(null, JSON.parse(text));
      } catch (err) {
        (err as { statusCode?: number }).statusCode = 400;
        done(err as Error, undefined);
      }
    },
  );

  // Allow browser clients (Flutter web) to call the API cross-origin.
  await app.register(fastifyCors, { origin: true });

  await app.register(fastifySwagger, {
    openapi: {
      info: { title: 'Trotxi API', version: '0.1.0' },
    },
  });
  await app.register(fastifySwaggerUi, { routePrefix: '/docs' });

  app.setErrorHandler((error: unknown, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({ error: error.code, message: error.message });
    }
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode && err.statusCode < 500) {
      return reply
        .code(err.statusCode)
        .send({ error: 'REQUEST_ERROR', message: err.message ?? 'Request error' });
    }
    app.log.error(error);
    return reply.code(500).send({ error: 'INTERNAL', message: 'Internal server error' });
  });

  const guard = makeAuthGuard(deps.jwt);
  const authService = new AuthService(deps.users, deps.jwt);
  const subscriptionService = new SubscriptionService(deps.subscriptions);
  const boardingService = new BoardingService(deps.trips, deps.boardings, subscriptionService);
  const paymentService = new PaymentService(deps.payments, deps.paymentProvider, subscriptionService);

  app.get('/', async () => ({
    service: 'trotxi-api',
    version: '0.1.0',
    docs: '/docs',
    health: '/healthz',
  }));

  await app.register(healthRoutes, { isReady: deps.isReady ?? (async () => true) });
  await app.register(authRoutes, { service: authService });
  await app.register(userRoutes, { users: deps.users, authGuard: guard });
  await app.register(subscriptionRoutes, { service: subscriptionService, authGuard: guard });
  await app.register(routeRoutes, { repo: deps.routes });
  await app.register(tripRoutes, { trips: deps.trips, boardings: boardingService, authGuard: guard });
  await app.register(passRoutes, { users: deps.users, boardings: boardingService });
  await app.register(paymentRoutes, { service: paymentService, authGuard: guard });

  return app;
}
