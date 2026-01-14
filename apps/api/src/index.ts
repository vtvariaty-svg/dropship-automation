import Fastify from "fastify";
import cookie from "@fastify/cookie";

import { env } from "./env";

import { shopContextPlugin } from "./plugins/shopContext";

import { rootRoutes } from "./routes/root";
import { shopifyRoutes } from "./routes/shopify";
import { shopifyAdminRoutes } from "./routes/shopifyAdmin";
import { shopifyWebhooksRoutes } from "./routes/shopifyWebhooks";

async function bootstrap() {
  const app = Fastify({ logger: true });

  await app.register(cookie);

  // Context loader (shop + token via DB, quando aplicável)
  await app.register(shopContextPlugin);

  // rotas básicas
  await app.register(rootRoutes);

  // OAuth install/callback
  await app.register(shopifyRoutes);

  // Admin API (REST/GraphQL) endpoints
  await app.register(shopifyAdminRoutes);

  // Webhooks receiver
  await app.register(shopifyWebhooksRoutes);

  await app.listen({
    port: env.PORT,
    host: "0.0.0.0",
  });

  app.log.info(`API running on port ${env.PORT}`);
}

bootstrap();
