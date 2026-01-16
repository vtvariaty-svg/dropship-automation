// apps/api/src/integrations/shopify/webhookStore.ts
import { pool } from "../../db/pool";

export type WebhookInsert = {
  webhookId: string;
  shop: string;
  topic: string;
  payload: unknown; // jsonb
  headers: unknown; // jsonb
  apiVersion: string | null;
  payloadRaw: string | null;
  status: "ok" | "invalid_hmac" | "error";
};

export async function insertWebhookEvent(
  e: WebhookInsert
): Promise<{ ok: true; id: number | null }> {
  const sql = `
    insert into shopify_webhook_events
      (webhook_id, shop, topic, payload, headers, received_at, status, api_version, payload_raw)
    values
      ($1, $2, $3, $4::jsonb, $5::jsonb, now(), $6, $7, $8)
    on conflict (webhook_id) do nothing
    returning id
  `;

  const res = await pool.query(sql, [
    e.webhookId,
    e.shop,
    e.topic,
    JSON.stringify(e.payload ?? {}),
    JSON.stringify(e.headers ?? {}),
    e.status,
    e.apiVersion,
    e.payloadRaw,
  ]);

  const id = (res.rows?.[0]?.id ?? null) as number | null;
  return { ok: true, id };
}

export async function updateWebhookEventStatus(args: {
  webhookId: string;
  status: string;
}): Promise<void> {
  const sql = `
    update shopify_webhook_events
    set status = $2
    where webhook_id = $1
  `;

  await pool.query(sql, [args.webhookId, args.status]);
}

export async function listWebhookEvents(args: {
  shop?: string;
  topic?: string;
  limit?: number;
}): Promise<
  Array<{ id: number; shop: string; topic: string; received_at: string; status: string }>
> {
  const where: string[] = [];
  const params: any[] = [];

  if (args.shop) {
    params.push(args.shop);
    where.push(`shop = $${params.length}`);
  }

  if (args.topic) {
    params.push(args.topic);
    where.push(`topic = $${params.length}`);
  }

  const limit = Math.max(1, Math.min(args.limit ?? 20, 200));
  params.push(limit);

  const sql = `
    select id, shop, topic, received_at, status
    from shopify_webhook_events
    ${where.length ? `where ${where.join(" and ")}` : ""}
    order by received_at desc
    limit $${params.length}
  `;

  const res = await pool.query(sql, params);
  return (res.rows ?? []) as any[];
}
