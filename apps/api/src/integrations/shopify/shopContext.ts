import { FastifyInstance, FastifyRequest } from "fastify";
import { loadShopContext, ShopContext } from "../integrations/shopify/context";

declare module "fastify" {
  interface FastifyRequest {
    shopContext?: ShopContext;
  }
}

export async function shopContextPlugin(app: FastifyInstance) {
  app.addHook("preHandler", async (req: FastifyRequest) => {
    const shop =
      (req.query as any)?.shop ||
      (req.headers["x-shopify-shop-domain"] as string | undefined);

    if (!shop) return;

    try {
      req.shopContext = await loadShopContext(String(shop));
    } catch {
      // não bloqueia rotas públicas
      req.shopContext = undefined;
    }
  });
}
