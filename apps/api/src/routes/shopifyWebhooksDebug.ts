import type { FastifyInstance } from "fastify";
import { insertWebhookEvent, listWebhookEvents } from "../integrations/shopify/webhookStore";
import crypto from "node:crypto";

function randomId(prefix = "dbg") {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

/**
 * Rotas de DEBUG (não usadas pelo Shopify).
 * - /__debug/webhooks/ingest ... cria evento fake no banco
 * - /__debug/webhooks/list?shop=... lista os últimos eventos
 */
export async function shopifyWebhooksDebugRoutes(app: FastifyInstance) {
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req, body, done) => {
      done(null, body);
    }
  );

  app.post("/__debug/webhooks/ingest", async (req, reply) => {
    const shop = (req.query as any)?.shop as string | undefined;
    const topic = ((req.query as any)?.topic as string | undefined) ?? "debug/test";
    if (!shop) {
      return reply.code(400).send({ ok: false, error: "Missing ?shop=" });
    }

    const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
    let payload: unknown = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }

    const webhookId = randomId("debug");

    const result = await insertWebhookEvent({
      webhookId,
      shop,
      topic,
      payload,
      headers: req.headers,
      status: "debug",
      apiVersion: null,
      payloadRaw: raw,
    });

    return reply.send({ ok: true, inserted: result.inserted, webhookId });
  });

  app.get("/__debug/webhooks/list", async (req, reply) => {
    const shop = (req.query as any)?.shop as string | undefined;
    const limitRaw = (req.query as any)?.limit as string | undefined;
    if (!shop) {
      return reply.code(400).send({ ok: false, error: "Missing ?shop=" });
    }
    const limit = limitRaw ? Math.max(1, Math.min(100, Number(limitRaw))) : 20;
    const rows = await listWebhookEvents({ shop, limit });
    return reply.send({ ok: true, rows });
  });
}
