import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { env } from "./env";

import { rootRoutes } from "./routes/root";
import { shopifyRoutes } from "./routes/shopify";
import { shopifyAdminRoutes } from "./routes/shopifyAdmin";
import { shopifyWebhooksRoutes } from "./routes/shopifyWebhooks";

import { shopContextPlugin } from "./plugins/shopContext";

async function bootstrap() {
  const app = Fastify({ logger: true });

  // Plugins base
  await app.register(cookie);

  // Plugin que carrega contexto (shop/token) por query/header
  await app.register(shopContextPlugin);

  // Rotas base
  await app.register(rootRoutes);

  // Shopify (OAuth, Admin, Webhooks)
  await app.register(shopifyRoutes);
  await app.register(shopifyAdminRoutes);
  await app.register(shopifyWebhooksRoutes);

  app.get("/health", async () => ({ ok: true }));
  app.get("/status", async () => ({ status: "running" }));

  await app.listen({
    port: env.PORT,
    host: "0.0.0.0",
  });

  app.log.info(`API running on port ${env.PORT}`);
}

bootstrap().catch((err) => {
  // garante log em crash de bootstrap
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
