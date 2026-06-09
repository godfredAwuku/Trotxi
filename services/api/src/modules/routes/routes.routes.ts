import type { FastifyInstance } from 'fastify';
import { AppError } from '../../lib/errors';
import type { RouteRepository } from './route.repository';

export async function routeRoutes(
  app: FastifyInstance,
  opts: { repo: RouteRepository },
): Promise<void> {
  const { repo } = opts;

  app.get('/routes', async () => {
    return repo.listActive();
  });

  app.get('/routes/:id', async (request) => {
    const { id } = request.params as { id: string };
    const route = await repo.findById(id);
    if (!route) {
      throw AppError.notFound('Route not found', 'ROUTE_NOT_FOUND');
    }
    const stops = await repo.listStops(id);
    return { ...route, stops };
  });
}
