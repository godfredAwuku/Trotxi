import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../../lib/validate';
import type { AuthService } from './auth.service';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const registerSchema = credentialsSchema.extend({
  role: z.enum(['commuter', 'driver', 'admin']).optional(),
});

export async function authRoutes(
  app: FastifyInstance,
  opts: { service: AuthService },
): Promise<void> {
  const { service } = opts;

  app.post('/auth/register', async (request, reply) => {
    const body = parse(registerSchema, request.body);
    const result = await service.register(body);
    return reply.code(201).send(result);
  });

  app.post('/auth/login', async (request, reply) => {
    const body = parse(credentialsSchema, request.body);
    const result = await service.login(body);
    return reply.code(200).send(result);
  });
}
