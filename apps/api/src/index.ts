import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { env } from "./env";
import { shopifyRoutes } from "./routes/shopify";
import { contextDebugRoutes } from "./routes/contextDebug";
import { loadShopContext } from "./integrations/shopify/context";
import { shopifyAdminTestRoutes } from "./routes/shopifyAdminTest";




async function bootstrap() {
  const app = Fastify({ logger: true });

  await app.register(cookie);

  // ✅ SHOP CONTEXT LOADER — GLOBAL (SEM ENCAPSULAMENTO)
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

  app.get("/health", async () => ({ ok: true }));
  app.get("/status", async () => ({ status: "running" }));

  await app.register(shopifyRoutes);
  await app.register(contextDebugRoutes);
  await app.register(shopifyAdminTestRoutes);

  await app.listen({
    port: env.PORT,
    host: "0.0.0.0",
  });

  app.log.info(`API running on port ${env.PORT}`);
}

bootstrap();
