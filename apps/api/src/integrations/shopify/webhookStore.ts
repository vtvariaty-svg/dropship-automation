import { pool } from "../../db/pool";

export type StoredWebhookEvent = {
  id: number;
  webhook_id: string;
  shop: string;
  topic: string;
  payload: unknown;
  headers: unknown;
  received_at: string;
  status: string;
  api_version: string | null;
  payload_raw: string | null;
};

export async function insertWebhookEvent(params: {
  webhookId: string;
  shop: string;
  topic: string;
  payload: unknown;
  headers: Record<string, unknown>;
  apiVersion?: string | null;
  payloadRaw?: string | null;
  status?: string;
}): Promise<{ inserted: boolean }> {
  const status = params.status ?? "received";

  const res = await pool.query(
    `
      insert into shopify_webhook_events
        (webhook_id, shop, topic, payload, headers, status, api_version, payload_raw)
      values
        ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8)
      on conflict (webhook_id) do nothing
    `,
    [
      params.webhookId,
      params.shop,
      params.topic,
      JSON.stringify(params.payload ?? null),
      JSON.stringify(params.headers ?? {}),
      params.status ?? status,
      params.apiVersion ?? null,
      params.payloadRaw ?? null,
    ]
  );

  // node-postgres retorna rowCount como number | null
  return { inserted: (res.rowCount ?? 0) > 0 };
}

export async function listWebhookEvents(params: {
  shop: string;
  limit?: number;
}): Promise<StoredWebhookEvent[]> {
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const res = await pool.query<StoredWebhookEvent>(
    `
      select id, webhook_id, shop, topic, payload, headers, received_at, status, api_version, payload_raw
      from shopify_webhook_events
      where shop = $1
      order by received_at desc
      limit $2
    `,
    [params.shop, limit]
  );
  return res.rows;
}
