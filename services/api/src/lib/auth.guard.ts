import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from './errors';
import { verifyToken, type AuthClaims, type Role } from './jwt';

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthClaims;
  }
}

// Fastify preHandler factory — validates the Bearer token and attaches claims.
export function authGuard(config: { secret: string; expiresIn: string }) {
  return async function (request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing or malformed Authorization header');
    }
    const token = header.slice('Bearer '.length).trim();
    try {
      request.auth = verifyToken(token, config);
    } catch {
      throw AppError.unauthorized('Invalid or expired token');
    }
  };
}

// preHandler that requires the authenticated user to hold one of the given roles.
// Use after authGuard, e.g. preHandler: [guard, requireRole('driver')].
export function requireRole(...roles: Role[]) {
  return async function (request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!request.auth || !roles.includes(request.auth.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to do that');
    }
  };
}
