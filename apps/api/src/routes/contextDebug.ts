import { FastifyInstance } from "fastify";

export async function contextDebugRoutes(app: FastifyInstance) {
  app.get("/__debug/context", async (req, reply) => {
    if (!req.shopContext) {
      return reply.status(401).send({ ok: false, context: null });
    }

    return {
      ok: true,
      shop: req.shopContext.shop,
      tokenLoaded: Boolean(req.shopContext.accessToken),
    };
  });
}
