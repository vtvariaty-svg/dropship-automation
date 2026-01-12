import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { env } from "./env";

import { shopifyRoutes } from "./routes/shopify";
import { shopifyAdminRoutes } from "./routes/shopifyAdmin";

import { loadShopContext } from "./integrations/shopify/context";

// (debug é opcional — pode remover depois)
// import { contextDebugRoutes } from "./routes/contextDebug";

async function bootstrap() {
  const app = Fastify({ logger: true });

  // cookies (state OAuth etc)
  await app.register(cookie);

  // ✅ SHOP CONTEXT LOADER — GLOBAL (sem encapsulamento)
  app.addHook("preHandler", async (req) => {
    const shopRaw =
      (req.query as any)?.shop ??
      (req.headers["x-shopify-shop-domain"] as string | undefined);

    if (!shopRaw) return;

    const shop = String(shopRaw).trim().toLowerCase();

    try {
      req.shopContext = await loadShopContext(shop);
    } catch (err) {
      req.log.warn(
        { shop, err: String((err as any)?.message ?? err) },
        "shopContext: not loaded"
      );
      req.shopContext = undefined;
    }
  });

  // healthchecks
  app.get("/health", async () => ({ ok: true }));
  app.get("/status", async () => ({ status: "running" }));

  // Shopify OAuth + Admin API
  await app.register(shopifyRoutes);
  await app.register(shopifyAdminRoutes);

  // se quiser manter debug temporariamente
  // await app.register(contextDebugRoutes);

  await app.listen({
    port: env.PORT,
    host: "0.0.0.0",
  });

  app.log.info(`API running on port ${env.PORT}`);
}

bootstrap();
