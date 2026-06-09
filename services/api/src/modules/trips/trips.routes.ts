import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import { AppError } from '../../lib/errors';
import type { BoardingService } from './boarding.service';
import type { TripRepository } from './trip.repository';

export async function tripRoutes(
  app: FastifyInstance,
  opts: { trips: TripRepository; boardings: BoardingService; authGuard: preHandlerHookHandler },
): Promise<void> {
  const { trips, boardings, authGuard } = opts;

  app.get('/trips', async (request) => {
    const { routeId } = request.query as { routeId?: string };
    return trips.listUpcoming(routeId);
  });

  app.get('/trips/:id', async (request) => {
    const { id } = request.params as { id: string };
    const trip = await trips.findById(id);
    if (!trip) {
      throw AppError.notFound('Trip not found', 'TRIP_NOT_FOUND');
    }
    return trip;
  });

  app.post('/trips/:id/board', { preHandler: authGuard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await boardings.board(request.auth!.sub, id);
    return reply.code(201).send(result);
  });

  app.get('/boardings/me', { preHandler: authGuard }, async (request) => {
    return boardings.history(request.auth!.sub);
  });
}
