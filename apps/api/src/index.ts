import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";

import { env } from "./env";
import { shopifyRoutes } from "./routes/shopify";
import { rootRoutes } from "./routes/root";

async function bootstrap() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie);

  await app.register(rootRoutes);
  await app.register(shopifyRoutes);

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  app.log.info(`API running on port ${env.PORT}`);
}

bootstrap();
