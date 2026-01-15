// apps/api/src/index.ts
import Fastify from "fastify";

import shopContextPlugin from "./plugins/shopContextPlugin";

import { rootRoutes } from "./routes/root";
import { shopifyRoutes } from "./routes/shopify";
import { shopifyWebhooksRoutes } from "./routes/shopifyWebhooks";
import { shopifyAdminRoutes } from "./routes/shopifyAdmin";

async function bootstrap() {
  const app = Fastify({ logger: true });

  // Plugin que injeta req.shopDomain (header/query)
  await app.register(shopContextPlugin);

  // Rotas básicas
  await app.register(rootRoutes);

  // IMPORTANTÍSSIMO:
  // Webhooks antes de qualquer plugin/rota que consuma o body de forma diferente,
  // pra manter o rawBody correto (HMAC).
  await app.register(shopifyWebhooksRoutes);

  // OAuth / install / callback
  await app.register(shopifyRoutes);

  // Admin endpoints (GraphQL/REST via token)
  await app.register(shopifyAdminRoutes);

  const port = Number(process.env.PORT ?? 3000);
  const host = "0.0.0.0";

  await app.listen({ port, host });
}

bootstrap().catch((err) => {
  // garante saída com erro em ambiente de deploy
  console.error(err);
  process.exit(1);
});
