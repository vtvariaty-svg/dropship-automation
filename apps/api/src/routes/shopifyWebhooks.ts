// apps/api/src/routes/shopifyWebhooks.ts
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { verifyWebhookHmac } from "../integrations/shopify/oauth";
import {
  insertWebhookEvent,
  updateWebhookEventStatus,
} from "../integrations/shopify/webhookStore";
import { cleanupShopOnUninstall } from "../integrations/shopify/store";
import { env } from "../env";

export const shopifyWebhooksRoutes: FastifyPluginAsync = async (app) => {
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    async (_req: FastifyRequest, body: Buffer) => body
  );

  app.post("/shopify/webhooks", async (req, reply) => {
    const headers = req.headers as Record<string, string | undefined>;

    const shop = headers["x-shopify-shop-domain"]!;
    const topic = headers["x-shopify-topic"]!;
    const webhookId = headers["x-shopify-webhook-id"]!;
    const hmacHeader = headers["x-shopify-hmac-sha256"]!;
    const apiVersion = headers["x-shopify-api-version"] ?? null;

    const rawBodyBuffer = req.body as Buffer;
    const rawBody = rawBodyBuffer.toString("utf8");

    const valid = verifyWebhookHmac({
      rawBody,
      hmacHeader,
      secret: env.SHOPIFY_CLIENT_SECRET,
    });

    if (!valid) {
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
      return reply.code(401).send({ ok: false });
    }

    const inserted = await insertWebhookEvent({
      webhookId,
      shop,
      topic,
      payload: JSON.parse(rawBody),
      payloadRaw: rawBody,
      headers,
      apiVersion,
      status: "received",
    });

    if (inserted.id === null) {
      return reply.code(200).send({ ok: true, duplicate: true });
    }

    if (topic === "app/uninstalled") {
      try {
        await cleanupShopOnUninstall(shop);
        await updateWebhookEventStatus({
          webhookId,
          status: "uninstalled_cleanup_ok",
        });
      } catch (err) {
        app.log.error({ err, shop }, "uninstall cleanup failed");
        await updateWebhookEventStatus({
          webhookId,
          status: "uninstalled_cleanup_error",
        });
      }
    }

    return reply.code(200).send({ ok: true });
  });
};
