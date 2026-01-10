import Fastify from "fastify";
import cookie from "@fastify/cookie";

import { env } from "./env";

import { healthRoutes } from "./routes/health";
import { statusRoutes } from "./routes/status";
import { runRoutes } from "./routes/run";
import { shopifyRoutes } from "./routes/shopify";
import { rootRoutes } from "./routes/root";


async function main() {
  const app = Fastify({ logger: true });

  // cookies (OAuth state)
  await app.register(cookie);

  // routes
  await app.register(rootRoutes);
  await app.register(healthRoutes);
  await app.register(statusRoutes);
  await app.register(runRoutes);
  await app.register(shopifyRoutes);

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
