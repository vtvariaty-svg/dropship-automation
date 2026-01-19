import Fastify from "fastify";
import cookie from "@fastify/cookie";

import { env } from "./env";
import { shopifyRoutes } from "./routes/shopify";
import { shopifyWebhooksRoutes } from "./routes/shopifyWebhooks";
import { adminRoutes } from "./routes/admin";
import { statusRoutes } from "./routes/status";

const app = Fastify({
  logger: true,
});

// Necessário para req.cookies / reply.setCookie tipado
app.register(cookie, {
  secret: env.COOKIE_SECRET ?? "dev-cookie-secret",
});

// Rotas
app.register(statusRoutes);
app.register(shopifyRoutes, { prefix: "/shopify" });
app.register(shopifyWebhooksRoutes, { prefix: "/shopify/webhooks" });
app.register(adminRoutes, { prefix: "/admin" });

app.get("/", async () => {
  return {
    ok: true,
    app: "CliqueBuy Automation",
    status: "running",
    message: "Shopify app installed and backend is responding",
    timestamp: new Date().toISOString(),
  };
});

// Observação: se você quiser /health, crie explicitamente:
app.get("/health", async () => ({ ok: true }));

const port = env.PORT ?? 3000;
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
