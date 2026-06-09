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
import type { UserRepository } from './modules/users/user.repository';
import { userRoutes } from './modules/users/users.routes';

export interface AppDeps {
  users: UserRepository;
  subscriptions: SubscriptionRepository;
  jwt: JwtConfig;
  isReady?: () => Promise<boolean>;
  logger?: boolean;
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: deps.logger ?? false });

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

  return app;
}
