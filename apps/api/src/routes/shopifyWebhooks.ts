import { createHmac, timingSafeEqual } from "node:crypto";
import { FastifyPluginAsync } from "fastify";
import { env } from "../env";
import { insertWebhookEvent } from "../integrations/shopify/webhookStore";

function verifyWebhookHmac(rawBody: Buffer, hmacHeader: string): boolean {
  const computed = createHmac("sha256", env.SHOPIFY_CLIENT_SECRET)
    .update(rawBody)
    .digest("base64");

  try {
    return timingSafeEqual(
      Buffer.from(computed, "utf8"),
      Buffer.from(hmacHeader, "utf8")
    );
  } catch {
    return false;
  }
}

export const shopifyWebhooksRoutes: FastifyPluginAsync = async (app) => {
  // Parser pra manter RAW body como Buffer (necessário pro HMAC)
  app.addContentTypeParser(
    ["application/json", "application/*+json"],
    { parseAs: "buffer" },
    (req, body, done) => {
      done(null, body);
    }
  );

  app.post("/shopify/webhooks", async (req, reply) => {
    const rawBody = req.body as Buffer;
    if (!Buffer.isBuffer(rawBody)) {
      reply.code(400);
      return { ok: false, error: "Expected raw body buffer" };
    }

    const shop = (req.headers["x-shopify-shop-domain"] as string) ?? null;
    const topic = (req.headers["x-shopify-topic"] as string) ?? null;
    const webhookId = (req.headers["x-shopify-webhook-id"] as string) ?? null;
    const hmac = (req.headers["x-shopify-hmac-sha256"] as string) ?? null;
    const apiVersion =
      ((req.headers["x-shopify-api-version"] as string) ?? null) || null;

    if (!shop || !topic || !webhookId || !hmac) {
      reply.code(400);
      return {
        ok: false,
        error: "Missing required webhook headers (shop/topic/webhook-id/hmac)",
      };
    }

    if (!verifyWebhookHmac(rawBody, hmac)) {
      reply.code(401);
      return { ok: false, error: "Invalid webhook HMAC" };
    }

    const payloadText = rawBody.toString("utf8");
    let payloadJson: unknown = {};
    try {
      payloadJson = payloadText ? JSON.parse(payloadText) : {};
    } catch {
      payloadJson = { _raw: payloadText };
    }

    await insertWebhookEvent({
      webhookId,
      shop,
      topic,
      apiVersion,
      payload: payloadJson,
      payloadRaw: payloadText,
      headers: req.headers as any,
      status: "received",
    });

    // Shopify exige 200 rápido
    return { ok: true };
  });
};
