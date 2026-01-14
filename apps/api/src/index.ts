import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";

import { shopifyAdminRoutes } from "./routes/shopifyAdmin";
import { env } from "./env";
import { shopifyRoutes } from "./routes/shopify";
import { rootRoutes } from "./routes/root";
import { shopifyWebhooksRoutes } from "./routes/shopifyWebhooks";
import { shopifyWebhooksDebugRoutes } from "./routes/shopifyWebhooksDebug";

async function bootstrap() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie);

  await app.register(rootRoutes);
  // Webhooks devem ser registrados antes de rotas que também parseiam JSON, para manter o rawBody isolado.
  await app.register(shopifyWebhooksRoutes);
  await app.register(shopifyWebhooksDebugRoutes);
  await app.register(shopifyRoutes);
  await app.register(shopifyAdminRoutes);

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  app.log.info(`API running on port ${env.PORT}`);
}

bootstrap();
