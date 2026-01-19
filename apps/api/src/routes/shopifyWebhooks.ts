// apps/api/src/routes/shopifyWebhooks.ts

import { FastifyInstance } from "fastify";
import { env } from "../env";
import { insertWebhookEvent } from "../integrations/shopify/webhookStore";
import { verifyWebhookHmac } from "../integrations/shopify/oauth";
import { cleanupShopOnUninstall } from "../integrations/shopify/store";

export async function shopifyWebhooksRoutes(app: FastifyInstance) {
  // OBS: para webhook HMAC ser validável, você precisa do raw body.
  // Se seu fastify já está setando req.rawBody via plugin/hook, ok.
  // Aqui fazemos fallback seguro: tenta obter string de req.body se já veio como string.
  app.post("/shopify/webhooks", async (req, reply) => {
    const headers = req.headers as Record<string, any>;
    const topic = String(headers["x-shopify-topic"] || "");
    const shop = String(headers["x-shopify-shop-domain"] || "").toLowerCase();
    const webhookId = String(headers["x-shopify-webhook-id"] || cryptoRandomId());
    const hmac = String(headers["x-shopify-hmac-sha256"] || "");

    const rawBody =
      (req as any).rawBody ??
      (typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {}));

    // Verifica HMAC do webhook
    const ok = verifyWebhookHmac(String(rawBody), hmac, env.SHOPIFY_CLIENT_SECRET);
    if (!ok) {
      await insertWebhookEvent({
        webhook_id: webhookId,
        shop,
        topic,
        status: "invalid_hmac",
        payload: req.body ?? null,
        payloadRaw: String(rawBody),
        headers,
      });
      return reply.code(401).send({ ok: false, error: "invalid webhook hmac" });
    }

    await insertWebhookEvent({
      webhook_id: webhookId,
      shop,
      topic,
      status: "received",
      payload: req.body ?? null,
      payloadRaw: String(rawBody),
      headers,
    });

    // Se desinstalou, limpa token
    if (topic === "app/uninstalled" && shop) {
      const result = await cleanupShopOnUninstall(shop);
      return reply.send({ ok: true, topic, cleanup: result });
    }

    return reply.send({ ok: true, topic });
  });
}

function cryptoRandomId(): string {
  // sem depender de crypto.randomUUID pra evitar qualquer ambiente antigo
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
