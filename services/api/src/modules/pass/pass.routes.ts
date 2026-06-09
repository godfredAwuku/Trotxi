import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../lib/errors';
import { parse } from '../../lib/validate';
import type { BoardingService } from '../trips/boarding.service';
import type { UserRepository } from '../users/user.repository';

const verifySchema = z.object({
  passCode: z.string().min(1),
});

/**
 * Verifies a rider's QR pass code. A conductor/driver app scans the rider's QR
 * (which encodes their passCode) and calls this to confirm a valid active ride
 * before letting them board the vehicle.
 */
export async function passRoutes(
  app: FastifyInstance,
  opts: { users: UserRepository; boardings: BoardingService },
): Promise<void> {
  const { users, boardings } = opts;

  app.post('/pass/verify', async (request) => {
    const { passCode } = parse(verifySchema, request.body);
    const user = await users.findByPassCode(passCode);
    if (!user) {
      throw AppError.notFound('Unknown pass code', 'INVALID_PASS');
    }
    const ride = await boardings.activeRide(user.id);
    return {
      valid: true,
      rider: { id: user.id, email: user.email },
      hasActiveRide: ride !== null,
      ride: ride ?? undefined,
    };
  });
}
