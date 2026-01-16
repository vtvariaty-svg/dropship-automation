// apps/api/src/routes/shopifyWebhooks.ts
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { verifyWebhookHmac } from "../integrations/shopify/oauth";
import {
  insertWebhookEvent,
  updateWebhookEventStatus,
  updateWebhookEventStatusById,
} from "../integrations/shopify/webhookStore";
import { cleanupShopOnUninstall } from "../integrations/shopify/store";
import { env } from "../env";

function norm(v: string | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

export const shopifyWebhooksRoutes: FastifyPluginAsync = async (app) => {
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    async (_req: FastifyRequest, body: Buffer) => body
  );

  app.post("/shopify/webhooks", async (req, reply) => {
    const headers = req.headers as Record<string, string | undefined>;

    const shop = headers["x-shopify-shop-domain"];
    const topicRaw = headers["x-shopify-topic"];
    const webhookId = headers["x-shopify-webhook-id"];
    const hmacHeader = headers["x-shopify-hmac-sha256"];
    const apiVersion = headers["x-shopify-api-version"] ?? null;

    const rawBodyBuffer = req.body as Buffer;
    const rawBody = rawBodyBuffer.toString("utf8");

    if (!shop || !topicRaw || !hmacHeader || !webhookId) {
      await insertWebhookEvent({
        webhookId: webhookId ?? `missing-${Date.now()}`,
        shop: shop ?? "unknown",
        topic: topicRaw ?? "unknown",
        payload: {},
        payloadRaw: rawBody,
        headers,
        apiVersion,
        status: "error",
      });
      return reply.code(200).send({ ok: true });
    }

    const valid = verifyWebhookHmac({
      rawBody,
      hmacHeader,
      secret: env.SHOPIFY_CLIENT_SECRET,
    });

    if (!valid) {
      await insertWebhookEvent({
        webhookId,
        shop,
        topic: topicRaw,
        payload: {},
        payloadRaw: rawBody,
        headers,
        apiVersion,
        status: "invalid_hmac",
      });
      return reply.code(401).send({ ok: false });
    }

    const inserted = await insertWebhookEvent({
      webhookId,
      shop,
      topic: topicRaw,
      payload: JSON.parse(rawBody),
      payloadRaw: rawBody,
      headers,
      apiVersion,
      status: "received",
    });

    if (inserted.id === null) {
      return reply.code(200).send({ ok: true, duplicate: true });
    }

    if (norm(topicRaw) === "app/uninstalled") {
      try {
        await cleanupShopOnUninstall(shop);
        await updateWebhookEventStatusById({
          id: inserted.id,
          status: "uninstalled_cleanup_ok",
        });
        await updateWebhookEventStatus({
          webhookId,
          status: "uninstalled_cleanup_ok",
        });
      } catch {
        await updateWebhookEventStatusById({
          id: inserted.id,
          status: "uninstalled_cleanup_error",
        });
      }
    }

    return reply.code(200).send({ ok: true });
  });
};
