import Fastify from "fastify";

import { rootRoutes } from "./routes/root";
import { shopifyRoutes } from "./routes/shopify";
import { shopifyWebhooksRoutes } from "./routes/shopifyWebhooks";
import { shopifyAdminRoutes } from "./routes/shopifyAdmin";

import { shopContextPlugin } from "./plugins/shopContextPlugin";

// Se você tiver um plugin que adiciona request.rawBody, mantenha.
// Caso não exista no teu projeto, remova esta linha e use o parser buffer no route do webhook (já está feito lá).
// import { rawBodyPlugin } from "./plugins/rawBodyPlugin";

async function bootstrap() {
  const app = Fastify({ logger: true });

  // Plugins base
  // await app.register(rawBodyPlugin);
  await app.register(shopContextPlugin);

  // Rotas base
  await app.register(rootRoutes);

  /**
   * IMPORTANTE:
   * Webhooks devem ser registrados antes de rotas que parseiam JSON,
   * para garantir que o corpo bruto (raw) seja preservado.
   */
  await app.register(shopifyWebhooksRoutes);

  // OAuth / Shopify (install/callback)
  await app.register(shopifyRoutes);

  // Admin endpoints (GraphQL)
  await app.register(shopifyAdminRoutes);

  const port = Number(process.env.PORT || 3000);
  const host = "0.0.0.0";

  await app.listen({ port, host });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
