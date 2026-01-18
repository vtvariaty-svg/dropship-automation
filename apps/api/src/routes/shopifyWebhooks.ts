// apps/api/src/routes/shopifyWebhooks.ts
import type { FastifyInstance } from "fastify";
import { env } from "../env";
import { verifyWebhookHmac } from "../integrations/shopify/oauth";
import { insertWebhookEvent } from "../integrations/shopify/webhookStore";
import { cleanupShopOnUninstall } from "../integrations/shopify/store";
import { pool } from "../db/pool";

type WebhookStatus =
  | "received"
  | "ok"
  | "invalid_hmac"
  | "error"
  | "uninstalled_cleanup_ok"
  | "uninstalled_cleanup_error"
  | string;

function header(req: any, name: string): string {
  const v = req.headers?.[name.toLowerCase()];
  if (Array.isArray(v)) return String(v[0] ?? "");
  return String(v ?? "");
}

export async function shopifyWebhooksRoutes(app: FastifyInstance) {
  app.post("/shopify/webhooks", async (req, reply) => {
    // ⚠ raw body já existe no seu projeto (plugin)
    const rawBody = String((req as any).rawBody ?? "");

    const hmacHeader = header(req, "X-Shopify-Hmac-Sha256");
    const topic = header(req, "X-Shopify-Topic");
    const shop = header(req, "X-Shopify-Shop-Domain");
    const webhookId =
      header(req, "X-Shopify-Webhook-Id") || `no-id-${Date.now()}`;

    // 1) validar HMAC
    const hmacOk = verifyWebhookHmac({
      rawBody,
      hmacHeader,
      secret: env.SHOPIFY_CLIENT_SECRET,
    });

    if (!hmacOk) {
      try {
        await insertWebhookEvent({
          webhookId,
          shop,
          topic,
          status: "invalid_hmac",
          body: rawBody, // ✅ contrato correto
        });
      } catch {}

      return reply.code(200).send({ ok: true, status: "invalid_hmac" });
    }

    // 2) persistir evento (idempotente)
    try {
      await insertWebhookEvent({
        webhookId,
        shop,
        topic,
        status: "received",
        body: rawBody, // ✅ contrato correto
      });
    } catch {
      // duplicado = ok
    }

    // 3) uninstall real
    if (topic === "app/uninstalled") {
      try {
        await cleanupShopOnUninstall(shop);

        try {
          await pool.query(
            `
            update shopify_webhook_events
            set status = $1
            where webhook_id = $2
            `,
            ["uninstalled_cleanup_ok", webhookId]
          );
        } catch {}

        return reply
          .code(200)
          .send({ ok: true, status: "uninstalled_cleanup_ok" });
      } catch (e) {
        try {
          await pool.query(
            `
            update shopify_webhook_events
            set status = $1
            where webhook_id = $2
            `,
            ["uninstalled_cleanup_error", webhookId]
          );
        } catch {}

        return reply
          .code(200)
          .send({ ok: true, status: "uninstalled_cleanup_error" });
      }
    }

    // 4) outros eventos
    return reply.code(200).send({ ok: true, status: "ok" });
  });
}
