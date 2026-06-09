import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import { z } from 'zod';
import { parse } from '../../lib/validate';
import type { PaymentService } from './payment.service';

const checkoutSchema = z.object({
  plan: z.literal('commuter_monthly').default('commuter_monthly'),
  phone: z.string().min(9, 'Enter a valid mobile-money number'),
  network: z.enum(['mtn', 'telecel', 'airteltigo']),
});

const webhookSchema = z.object({
  reference: z.string().min(1),
  status: z.enum(['success', 'failed']),
});

export async function paymentRoutes(
  app: FastifyInstance,
  opts: { service: PaymentService; authGuard: preHandlerHookHandler },
): Promise<void> {
  const { service, authGuard } = opts;

  // Start a mobile-money payment for a subscription.
  app.post('/payments/checkout', { preHandler: authGuard }, async (request, reply) => {
    const body = parse(checkoutSchema, request.body ?? {});
    const result = await service.checkout(request.auth!.sub, body);
    return reply.code(201).send(result);
  });

  // Provider webhook (real providers sign this; verify the signature there).
  app.post('/payments/webhook', async (request) => {
    const { reference, status } = parse(webhookSchema, request.body);
    const payment = await service.handleWebhook(reference, status);
    return { received: true, status: payment.status };
  });

  app.get('/payments/me', { preHandler: authGuard }, async (request) => {
    return service.history(request.auth!.sub);
  });
}
