// apps/api/src/index.ts
import Fastify from "fastify";
import { shopifyRoutes } from "./routes/shopify";
import { shopifyWebhooksRoutes } from "./routes/shopifyWebhooks";

const app = Fastify({
  logger: true,
});

app.register(shopifyRoutes);
app.register(shopifyWebhooksRoutes);

app.get("/", async () => {
  return {
    ok: true,
    app: "CliqueBuy Automation",
    status: "running",
    message: "Shopify app installed and backend is responding",
    timestamp: new Date().toISOString(),
  };
});

const port = Number(process.env.PORT || 3000);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

