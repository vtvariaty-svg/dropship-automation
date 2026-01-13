import { pool } from "../../db/pool";

export type ShopifyWebhookInsert = {
  webhookId: string;
  shop: string;
  topic: string;
  apiVersion?: string | null;
  payloadJson: unknown;
  payloadRaw: string;
  headersJson: Record<string, unknown>;
};

export async function insertWebhookEventIfNew(input: ShopifyWebhookInsert): Promise<{
  inserted: boolean;
}> {
  const res = await pool.query(
    `
    INSERT INTO shopify_webhook_events(
      webhook_id, shop, topic, api_version, payload_json, payload_raw, headers_json
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb)
    ON CONFLICT (webhook_id) DO NOTHING
    RETURNING id
    `,
    [
      input.webhookId,
      input.shop,
      input.topic,
      input.apiVersion ?? null,
      JSON.stringify(input.payloadJson ?? {}),
      input.payloadRaw,
      JSON.stringify(input.headersJson ?? {}),
    ]
  );

  return { inserted: res.rowCount > 0 };
}
