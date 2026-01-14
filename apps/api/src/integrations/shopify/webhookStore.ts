import { pool } from "../../db/pool";

type InsertWebhookParams = {
  webhookId: string;
  shop: string;
  topic: string;
  apiVersion: string | null;
  payloadJson: unknown;
  payloadRaw: string;
  headersJson: Record<string, unknown>;
};

export async function insertWebhookEventIfNew(params: InsertWebhookParams) {
  const { webhookId, shop, topic, apiVersion, payloadJson, payloadRaw, headersJson } = params;

  const res = await pool.query(
    `
    insert into shopify_webhook_events
      (webhook_id, shop, topic, api_version, payload, payload_raw, headers, received_at, status)
    values
      ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, now(), 'received')
    on conflict (webhook_id) do nothing
    `,
    [webhookId, shop, topic, apiVersion, JSON.stringify(payloadJson ?? null), payloadRaw, JSON.stringify(headersJson ?? {})]
  );

  const inserted = (res.rowCount ?? 0) > 0;
  return { inserted };
}
