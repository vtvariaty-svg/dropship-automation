// apps/api/src/routes/shopifyWebhooks.ts
import type { FastifyInstance } from "fastify";
import { env } from "../env";
import { verifyWebhookHmac } from "../integrations/shopify/oauth";
import { insertWebhookEvent } from "../integrations/shopify/webhookStore";
import { cleanupShopOnUninstall } from "../integrations/shopify/store";
import { pool } from "../db/pool";

type WebhookStatus = "received" | "ok" | "invalid_hmac" | "error" | string;

function header(req: any, name: string): string {
  const v = req.headers?.[name.toLowerCase()];
  if (Array.isArray(v)) return String(v[0] ?? "");
  return String(v ?? "");
}

export async function shopifyWebhooksRoutes(app: FastifyInstance) {
  // POST /shopify/webhooks
  app.post("/shopify/webhooks", async (req, reply) => {
    const rawBody = (req as any).rawBody ?? ""; // seu projeto já injeta rawBody
    const hmacHeader = header(req, "X-Shopify-Hmac-Sha256");
    const topic = header(req, "X-Shopify-Topic");
    const shop = header(req, "X-Shopify-Shop-Domain");
    const webhookId = header(req, "X-Shopify-Webhook-Id") || `no-id-${Date.now()}`;

    // 1) valida HMAC com RAW body (obrigatório)
    const hmacOk = verifyWebhookHmac({
      rawBody: String(rawBody),
      hmacHeader,
      secret: env.SHOPIFY_CLIENT_SECRET,
    });

    if (!hmacOk) {
      // persistir evento inválido também (auditoria)
      try {
        await insertWebhookEvent({
          webhookId,
          shop,
          topic,
          status: "invalid_hmac",
          rawBody: String(rawBody),
        });
      } catch (e) {
        console.log(
          JSON.stringify({
            msg: "webhook.persist.invalid_hmac_failed",
            err: (e as Error)?.message ?? String(e),
          })
        );
      }

      return reply.code(200).send({ ok: true, status: "invalid_hmac" });
    }

    // 2) persiste o evento (idempotente via índice único)
    let persistedStatus: WebhookStatus = "received";
    try {
      await insertWebhookEvent({
        webhookId,
        shop,
        topic,
        status: "received",
        rawBody: String(rawBody),
      });
    } catch (e) {
      // se duplicado, tudo bem: responder 200 rápido
      console.log(
        JSON.stringify({
          msg: "webhook.persist.failed_or_duplicate",
          shop,
          topic,
          webhookId,
          err: (e as Error)?.message ?? String(e),
        })
      );
      // continua o fluxo: idempotência
    }

    // 3) fluxo real do uninstall (passo #1 obrigatório do projeto)
    if (topic === "app/uninstalled") {
      try {
        await cleanupShopOnUninstall(shop);

        // atualiza status para auditoria (se existir coluna status)
        // - se não existir, esse update falha e a gente apenas loga (não quebra webhook)
        try {
          await pool.query(
            `
            update shopify_webhook_events
            set status = $1
            where webhook_id = $2
            `,
            ["uninstalled_cleanup_ok", webhookId]
          );
        } catch (e2) {
          console.log(
            JSON.stringify({
              msg: "webhook.uninstall.status_update_failed",
              webhookId,
              err: (e2 as Error)?.message ?? String(e2),
            })
          );
        }

        persistedStatus = "uninstalled_cleanup_ok";
      } catch (e) {
        console.log(
          JSON.stringify({
            msg: "webhook.uninstall.cleanup_failed",
            shop,
            webhookId,
            err: (e as Error)?.message ?? String(e),
          })
        );

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

        persistedStatus = "uninstalled_cleanup_error";
      }

      // responder rápido
      return reply.code(200).send({ ok: true, status: persistedStatus });
    }

    // 4) outros tópicos: ok
    return reply.code(200).send({ ok: true, status: "ok" });
  });
}
