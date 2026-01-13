import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";

import { env } from "./env";

import { rootRoutes } from "./routes/root";
import { shopifyRoutes } from "./routes/shopify";
import { shopifyAdminRoutes } from "./routes/shopifyAdmin";
import { shopifyWebhookRoutes } from "./routes/shopifyWebhooks";

import { loadShopContext } from "./integrations/shopify/context";
import { runMigrations } from "./db/migrate";
import { shopifyWebhooksDebugRoutes } from "./routes/shopifyWebhooksDebug";
async function bootstrap() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie);

  // ✅ Captura RAW body para validar HMAC de webhooks Shopify
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body, done) => {
      const buf = body as Buffer;
      (req as any).rawBody = buf.toString("utf8");

      // mantém req.body como objeto JSON
      try {
        const parsed = JSON.parse((req as any).rawBody);
        done(null, parsed);
      } catch {
        // se falhar, mantém string (ainda dá pra salvar)
        done(null, (req as any).rawBody);
      }
    }
  );

  // ✅ migrations (garante tabela de webhooks e oauth etc)
  await runMigrations();

  // ✅ Shop Context Loader — global (multi-tenant)
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

  // rotas base
  await app.register(rootRoutes);
  app.get("/health", async () => ({ ok: true }));
  app.get("/status", async () => ({ status: "running" }));

  // Shopify
  await app.register(shopifyRoutes);
  await app.register(shopifyAdminRoutes);

  // ✅ Webhooks
  await app.register(shopifyWebhookRoutes);

  await app.register(shopifyWebhooksDebugRoutes);

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  app.log.info(`API running on port ${env.PORT}`);
}

bootstrap();
