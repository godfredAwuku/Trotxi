import type { FastifyInstance } from 'fastify';

export async function healthRoutes(
  app: FastifyInstance,
  opts: { isReady: () => Promise<boolean> },
): Promise<void> {
  app.get('/healthz', async () => ({ status: 'ok', uptime: process.uptime() }));

  app.get('/readyz', async (_request, reply) => {
    const ready = await opts.isReady();
    if (!ready) {
      return reply.code(503).send({ status: 'not_ready' });
    }
    return { status: 'ready' };
  });
}
