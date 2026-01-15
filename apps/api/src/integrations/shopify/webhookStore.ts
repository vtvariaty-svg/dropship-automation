import { pool } from "../../db/pool";

export type InsertWebhookParams = {
  webhookId: string;
  shop: string;
  topic: string;
  apiVersion: string | null;
  payloadJson: unknown;
  payloadRaw: string;
  headersJson: Record<string, unknown>;
};

export async function insertWebhookEventIfNew(params: InsertWebhookParams): Promise<{
  ok: true;
  inserted: boolean;
  id: number | null;
}> {
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
    insert into shopify_webhook_events
      (webhook_id, shop, topic, api_version, payload, payload_raw, headers, received_at, status)
    values
      ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, now(), 'received')
    on conflict (webhook_id) do nothing
    returning id
    `,
    [
      webhookId,
      shop,
      topic,
      apiVersion,
      JSON.stringify(payloadJson ?? {}),
      payloadRaw ?? "",
      JSON.stringify(headersJson ?? {}),
    ]
  );

  const id = (res.rows?.[0]?.id ?? null) as number | null;
  const inserted = id !== null;

  return { ok: true, inserted, id };
}

/**
 * Útil pra debug interno (caso exista rota debug no seu repo)
 */
export async function listWebhookEvents(params: {
  shop?: string;
  topic?: string;
  limit?: number;
}): Promise<
  Array<{
    id: number;
    webhook_id: string;
    shop: string;
    topic: string;
    received_at: string;
    api_version: string | null;
    status: string | null;
  }>
> {
  const { shop, topic, limit = 50 } = params;

  const where: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (shop) {
    where.push(`shop = $${i++}`);
    values.push(shop);
  }
  if (topic) {
    where.push(`topic = $${i++}`);
    values.push(topic);
  }

  const sql = `
    select id, webhook_id, shop, topic, received_at, api_version, status
    from shopify_webhook_events
    ${where.length ? `where ${where.join(" and ")}` : ""}
    order by received_at desc
    limit ${Number(limit) || 50}
  `;

  const res = await pool.query(sql, values);
  return res.rows ?? [];
}
