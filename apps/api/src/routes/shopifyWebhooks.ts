// apps/api/src/routes/shopifyWebhooks.ts
import { FastifyPluginAsync } from "fastify";
import { ShopifyAdapter } from "../platforms/shopify/shopifyAdapter";
import { cleanupShopOnUninstall } from "../integrations/shopify/store";
import { insertWebhookEvent } from "../integrations/shopify/webhookStore";

export const shopifyWebhooksRoutes: FastifyPluginAsync = async (app) => {
  const adapter = new ShopifyAdapter();

  app.post("/shopify/webhooks", async (request, reply) => {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_CLIENT_SECRET || "";
    if (!secret) return reply.code(500).send({ ok: false, error: "Missing SHOPIFY_WEBHOOK_SECRET/SHOPIFY_CLIENT_SECRET" });

    // Fastify pode não tipar rawBody; pegamos via any
    const rawBody =
      (request as any).rawBody?.toString?.("utf8") ||
      (request as any).bodyRaw?.toString?.("utf8") ||
      (typeof (request as any).body === "string" ? (request as any).body : JSON.stringify((request as any).body || {}));

    const hmacHeader =
      String((request.headers["x-shopify-hmac-sha256"] as any) || "");

    const topic =
      String((request.headers["x-shopify-topic"] as any) || "").toLowerCase();

    const shop =
      String((request.headers["x-shopify-shop-domain"] as any) || "").toLowerCase();

    const webhookId =
      String((request.headers["x-shopify-webhook-id"] as any) || `evt_${Date.now()}`);

    const ok = adapter.verifyWebhookHmac({
      rawBody,
      signatureHeader: hmacHeader,
      secret,
    });

    await insertWebhookEvent({
      webhook_id: webhookId,
      shop,
      topic,
      status: ok ? "received" : "failed",
    });

    if (!ok) return reply.code(401).send({ ok: false });

    // ação por tópico
    if (topic === "app/uninstalled") {
      await cleanupShopOnUninstall(shop);
    }

    return reply.send({ ok: true });
  });
};
