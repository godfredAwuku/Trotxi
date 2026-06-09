import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import { AppError } from '../../lib/errors';
import type { UserRepository } from './user.repository';

export async function userRoutes(
  app: FastifyInstance,
  opts: { users: UserRepository; authGuard: preHandlerHookHandler },
): Promise<void> {
  const { users, authGuard } = opts;

  app.get('/users/me', { preHandler: authGuard }, async (request) => {
    const claims = request.auth!;
    const user = await users.findById(claims.sub);
    if (!user) {
      throw AppError.notFound('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  });
}
