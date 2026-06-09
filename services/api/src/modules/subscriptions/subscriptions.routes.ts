import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import { z } from 'zod';
import { parse } from '../../lib/validate';
import type { SubscriptionService } from './subscription.service';

const subscribeSchema = z.object({
  plan: z.literal('commuter_monthly').default('commuter_monthly'),
});

const redeemSchema = z.object({
  tokens: z.coerce.number().int().positive().default(1),
});

export async function subscriptionRoutes(
  app: FastifyInstance,
  opts: { service: SubscriptionService; authGuard: preHandlerHookHandler },
): Promise<void> {
  const { service, authGuard } = opts;

  app.post('/subscriptions', { preHandler: authGuard }, async (request, reply) => {
    const { plan } = parse(subscribeSchema, request.body ?? {});
    const sub = await service.subscribe(request.auth!.sub, plan);
    return reply.code(201).send(sub);
  });

  app.get('/subscriptions/me', { preHandler: authGuard }, async (request) => {
    return service.getActive(request.auth!.sub);
  });

  app.post('/subscriptions/redeem', { preHandler: authGuard }, async (request) => {
    const { tokens } = parse(redeemSchema, request.body ?? {});
    return service.redeem(request.auth!.sub, tokens);
  });
}
