import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../lib/errors';
import { parse } from '../../lib/validate';
import type { BoardingService } from './boarding.service';
import type { LivePositionService } from './live.service';
import type { TripRepository } from './trip.repository';

const positionSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  bearing: z.number().min(0).max(360).optional(),
});

export async function tripRoutes(
  app: FastifyInstance,
  opts: {
    trips: TripRepository;
    boardings: BoardingService;
    live: LivePositionService;
    authGuard: preHandlerHookHandler;
    driverGuard: preHandlerHookHandler;
  },
): Promise<void> {
  const { trips, boardings, live, authGuard, driverGuard } = opts;

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

  // Live vehicle position for the map (driver-reported when fresh, else simulated).
  app.get('/trips/:id/position', async (request) => {
    const { id } = request.params as { id: string };
    const position = await live.positionFor(id);
    if (!position) {
      throw AppError.notFound('No live position for this trip', 'NO_POSITION');
    }
    return position;
  });

  // Driver app publishes the vehicle's GPS fix for a trip.
  app.post('/trips/:id/position', { preHandler: [authGuard, driverGuard] }, async (request) => {
    const { id } = request.params as { id: string };
    const trip = await trips.findById(id);
    if (!trip) {
      throw AppError.notFound('Trip not found', 'TRIP_NOT_FOUND');
    }
    const fix = parse(positionSchema, request.body);
    live.report(id, fix);
    return { ok: true };
  });

  app.post('/trips/:id/board', { preHandler: authGuard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await boardings.board(request.auth!.sub, id);
    return reply.code(201).send(result);
  });

  app.get('/boardings/me', { preHandler: authGuard }, async (request) => {
    return boardings.history(request.auth!.sub);
  });

  // Current active ride (or { active: false }) — drives the home screen state.
  app.get('/boardings/active', { preHandler: authGuard }, async (request) => {
    const ride = await boardings.activeRide(request.auth!.sub);
    return ride ? { active: true, ...ride } : { active: false };
  });

  // End the current ride so the rider can board another.
  app.post('/boardings/active/complete', { preHandler: authGuard }, async (request) => {
    return boardings.completeRide(request.auth!.sub);
  });
}
