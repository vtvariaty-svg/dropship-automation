// apps/api/src/routes/shopifyWebhooks.ts
import type { FastifyPluginAsync } from "fastify";
import { insertWebhookEvent, updateWebhookStatusByWebhookId } from "../integrations/shopify/webhookStore";
import { verifyWebhookHmac } from "../integrations/shopify/oauth";
import { env } from "../env";
import { cleanupShopOnUninstall } from "../integrations/shopify/store";

export const shopifyWebhooksRoutes: FastifyPluginAsync = async (app) => {
  // Shopify sends POST /shopify/webhooks with headers:
  // - x-shopify-topic
  // - x-shopify-shop-domain
  // - x-shopify-hmac-sha256
  // - x-shopify-api-version
  app.post("/shopify/webhooks", async (request, reply) => {
    const headersLower: Record<string, string> = {};
    for (const [k, v] of Object.entries(request.headers)) {
      if (typeof v === "string") headersLower[k.toLowerCase()] = v;
      else if (Array.isArray(v)) headersLower[k.toLowerCase()] = v.join(",");
    }

    const topic = headersLower["x-shopify-topic"] || "unknown";
    const shop = headersLower["x-shopify-shop-domain"] || "unknown";
    const hmac = headersLower["x-shopify-hmac-sha256"];
    const apiVersion = headersLower["x-shopify-api-version"] || null;
    const webhookId = headersLower["x-shopify-webhook-id"] || `no-id-${Date.now()}`;

    const rawBody = typeof request.body === "string" ? request.body : JSON.stringify(request.body ?? {});
    const isValid = verifyWebhookHmac({ rawBody, hmacHeader: hmac, clientSecret: env.SHOPIFY_CLIENT_SECRET });

    if (!isValid) {
      return reply.code(401).send({ ok: false });
    }

    // Always record the webhook event as "received" first (auditing).
    await insertWebhookEvent({
      webhookId,
      shop,
      topic,
      payload: JSON.parse(rawBody),
      payloadRaw: rawBody,
      headers: headersLower,
      apiVersion,
      status: "received",
    });

    // Processing (minimal): if uninstall, cleanup token + mark status
    if (topic === "app/uninstalled") {
      try {
        const result = await cleanupShopOnUninstall(shop);
        const status = result.deleted > 0 ? "uninstalled_cleanup_ok" : "uninstalled_cleanup_no_token";
        await updateWebhookStatusByWebhookId(webhookId, status);
      } catch (e) {
        await updateWebhookStatusByWebhookId(webhookId, "uninstalled_cleanup_error");
      }
    }

    return reply.send({ ok: true });
  });
};
