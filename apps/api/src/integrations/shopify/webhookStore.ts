import { pool } from "../db/pool";

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
  const {
    webhookId,
    shop,
    topic,
    apiVersion,
    payloadJson,
    payloadRaw,
    headersJson,
  } = params;

  const res = await pool.query(
    `
    insert into shopify_webhook_events (
      webhook_id,
      shop,
      topic,
      api_version,
      payload,
      payload_raw,
      headers
    )
    values ($1, $2, $3, $4, $5, $6, $7)
    on conflict (webhook_id) do nothing
    returning id
    `,
    [
      webhookId,
      shop,
      topic,
      apiVersion,
      payloadJson,
      payloadRaw,
      headersJson,
    ]
  );

  // rowCount pode ser null no tipo do pg
  const inserted = (res.rowCount ?? 0) > 0;

  return { inserted };
}
