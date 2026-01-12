import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { env } from "./env";
import { shopifyRoutes } from "./routes/shopify";

async function bootstrap() {
  const app = Fastify({ logger: true });

  await app.register(cookie);

  app.get("/health", async () => ({ ok: true }));
  app.get("/status", async () => ({ status: "running" }));

  await app.register(shopifyRoutes);

  await app.listen({
    port: env.PORT,
    host: "0.0.0.0",
  });

  app.log.info(`API running on port ${env.PORT}`);
}

bootstrap();
