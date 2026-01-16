// apps/api/src/integrations/shopify/webhookStore.ts
import { pool } from "../../db/pool";

export type WebhookStatus =
  | "received"
  | "ok"
  | "invalid_hmac"
  | "uninstalled_cleanup_ok"
  | "uninstalled_cleanup_error"
  | "error";

export type WebhookInsert = {
  webhookId: string;
  shop: string;
  topic: string;
  payload: unknown;
  headers: unknown;
  apiVersion: string | null;
  payloadRaw: string | null;
  status: WebhookStatus;
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

  return { ok: true, id: res.rows?.[0]?.id ?? null };
}

export async function updateWebhookEventStatus(args: {
  webhookId: string;
  status: WebhookStatus;
}): Promise<void> {
  await pool.query(
    `
    update shopify_webhook_events
    set status = $2
    where webhook_id = $1
  `,
    [args.webhookId, args.status]
  );
}

export async function updateWebhookEventStatusById(args: {
  id: number;
  status: WebhookStatus;
}): Promise<void> {
  await pool.query(
    `
    update shopify_webhook_events
    set status = $2
    where id = $1
  `,
    [args.id, args.status]
  );
}
