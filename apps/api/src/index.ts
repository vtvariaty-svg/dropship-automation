import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { env } from "./env";
import { shopifyRoutes } from "./routes/shopify";
import { shopContextPlugin } from "./plugins/shopContext";
import { contextDebugRoutes } from "./routes/contextDebug";

async function bootstrap() {
  const app = Fastify({ logger: true });

  await app.register(cookie);
  await app.register(shopContextPlugin);
  await app.register(contextDebugRoutes);

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


