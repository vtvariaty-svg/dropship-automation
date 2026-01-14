import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { env } from "../env";
import { insertWebhookEvent } from "../integrations/shopify/webhookStore";

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function verifyShopifyHmac(params: {
  rawBody: Buffer;
  hmacHeader: string | undefined;
  sharedSecret: string;
}): boolean {
  const header = params.hmacHeader;
  if (!header) return false;
  const digest = crypto
    .createHmac("sha256", params.sharedSecret)
    .update(params.rawBody)
    .digest("base64");
  return timingSafeEqual(digest, header);
}

/**
 * Webhook receiver (Shopify -> sua API)
 *
 * Shopify chama via POST. GET dá 404 (normal).
 */
export async function shopifyWebhooksRoutes(app: FastifyInstance) {
  // Parser somente nesse escopo: precisamos do body em Buffer p/ validar HMAC.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body, done) => {
      done(null, body);
    }
  );

  app.post("/shopify/webhooks", async (req, reply) => {
    const rawBody = req.body as Buffer;

    const shop = (req.headers["x-shopify-shop-domain"] as string | undefined) ?? null;
    const topic = (req.headers["x-shopify-topic"] as string | undefined) ?? null;
    const webhookId = (req.headers["x-shopify-webhook-id"] as string | undefined) ?? null;
    const apiVersion = (req.headers["x-shopify-api-version"] as string | undefined) ?? null;
    const hmac = req.headers["x-shopify-hmac-sha256"] as string | undefined;

    if (!shop || !topic || !webhookId) {
      return reply.code(400).send({
        ok: false,
        error: "Missing required webhook headers (shop/topic/webhook-id)",
      });
    }

    const isValid = verifyShopifyHmac({
      rawBody,
      hmacHeader: hmac,
      sharedSecret: env.SHOPIFY_CLIENT_SECRET,
    });

    if (!isValid) {
      // Não armazena payload inválido (pode ser ataque)
      return reply.code(401).send({ ok: false, error: "Invalid webhook HMAC" });
    }

    let payload: unknown = null;
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch {
      // Shopify envia JSON; se falhar, registra raw mesmo assim
      payload = null;
    }

    await insertWebhookEvent({
      webhookId,
      shop,
      topic,
      payload,
      headers: req.headers,
      status: "received",
      apiVersion,
      payloadRaw: rawBody.toString("utf8"),
    });

    // Shopify espera 200 rápido.
    return reply.code(200).send({ ok: true });
  });
}
