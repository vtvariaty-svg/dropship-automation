// apps/api/src/routes/shopifyWebhooks.ts
import type { FastifyPluginAsync } from "fastify";
import { insertWebhookEvent } from "../integrations/shopify/webhookStore";
import { verifyWebhookHmac } from "../integrations/shopify/oauth";
import { cleanupShopOnUninstall } from "../integrations/shopify/store";
import { pool } from "../db/pool";
import { env } from "../env";

export const shopifyWebhooksRoutes: FastifyPluginAsync = async (app) => {
  // IMPORTANTE: para validar HMAC, precisamos do body RAW exatamente como veio.
  // O Fastify permite isso com `addContentTypeParser`.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    async (_req: unknown, body: Buffer) => body
  );

  app.post("/shopify/webhooks", async (req, reply) => {
    const headers = req.headers as Record<string, string | undefined>;
    const shop = headers["x-shopify-shop-domain"] || "";
    const topic = headers["x-shopify-topic"] || "";
    const webhookId =
      headers["x-shopify-webhook-id"] || `no-id-${Date.now()}`;
    const hmacHeader = headers["x-shopify-hmac-sha256"] || "";
    const apiVersion = headers["x-shopify-api-version"] || null;

    // `req.body` aqui é Buffer (por causa do parser acima)
    const rawBodyBuffer = req.body as Buffer;
    const rawBody = rawBodyBuffer.toString("utf8");

    const ok = verifyWebhookHmac({
      rawBody,
      hmacHeader,
      secret: env.SHOPIFY_CLIENT_SECRET,
    });

    if (!ok) {
      // ✅ Persistir auditoria do inválido (sem quebrar / sem retries infinitos)
      try {
        await insertWebhookEvent({
          webhookId,
          shop,
          topic,
          payload: {},
          payloadRaw: rawBody,
          headers,
          apiVersion,
          status: "invalid_hmac",
        });
      } catch {
        // silencioso: webhook deve responder rápido
      }

      return reply.code(200).send({ ok: true, status: "invalid_hmac" });
    }

    // Parse payload com segurança
    let parsedPayload: unknown = {};
    try {
      parsedPayload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      parsedPayload = {};
    }

    // 1) Persistir evento (idempotência fica por conta do DB/índice único)
    try {
      await insertWebhookEvent({
        webhookId,
        shop,
        topic,
        payload: parsedPayload,
        payloadRaw: rawBody,
        headers,
        apiVersion,
        status: "ok",
      });
    } catch {
      // duplicado ou falha de insert: não pode impedir o cleanup do uninstall
    }

    // 2) Fluxo real do app/uninstalled (cleanup token + status)
    if (topic === "app/uninstalled") {
      try {
        await cleanupShopOnUninstall(shop);

        // Atualiza status do evento para auditoria
        try {
          await pool.query(
            `
            update shopify_webhook_events
            set status = $1
            where webhook_id = $2
            `,
            ["uninstalled_cleanup_ok", webhookId]
          );
        } catch {
          // se a tabela/coluna divergir, não quebra o webhook
        }

        return reply.code(200).send({ ok: true, status: "uninstalled_cleanup_ok" });
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

        return reply.code(200).send({ ok: true, status: "uninstalled_cleanup_error" });
      }
    }

    return reply.send({ ok: true, status: "ok" });
  });
};
