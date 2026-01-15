// apps/api/src/routes/shopifyWebhooks.ts
import type { FastifyPluginAsync } from "fastify";
import { insertWebhookEvent } from "../integrations/shopify/webhookStore";
import { verifyWebhookHmac } from "../integrations/shopify/oauth";
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
    const webhookId = headers["x-shopify-webhook-id"] || "";
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
      return reply.code(401).send({ ok: false, error: "Invalid webhook HMAC" });
    }

    const inserted = await insertWebhookEvent({
      webhookId,
      shop,
      topic,
      payload: JSON.parse(rawBody),
      payloadRaw: rawBody,
      headers,
      apiVersion,
      status: "ok",
    });

    return reply.send({ ok: true, id: inserted.id });
  });
};
