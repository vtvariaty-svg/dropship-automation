// apps/api/src/integrations/shopify/webhookStore.ts
import { pool } from "../../db/pool";

export type WebhookStatus =
  | "received"
  | "ok"
  | "invalid_hmac"
  | "error"
  | "uninstalled_cleanup_ok"
  | "uninstalled_cleanup_no_token"
  | "uninstalled_cleanup_error";

export type WebhookInsert = {
  webhookId: string;
  shop: string;
  topic: string;
  status: WebhookStatus;
  payload: any;
  payloadRaw: string;
  headers: Record<string, string>;
  apiVersion: string | null;
};

export async function insertWebhookEvent(data: WebhookInsert): Promise<void> {
  await pool.query(
    `
    insert into shopify_webhook_events (
      webhook_id, shop, topic, status,
      payload, payload_raw,
      headers, api_version,
      received_at
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,now())
    on conflict (webhook_id) do nothing
    `,
    [
      data.webhookId,
      data.shop,
      data.topic,
      data.status,
      JSON.stringify(data.payload ?? null),
      data.payloadRaw,
      JSON.stringify(data.headers ?? {}),
      data.apiVersion,
    ]
  );
}

export async function updateWebhookStatusByWebhookId(webhookId: string, status: WebhookStatus): Promise<void> {
  await pool.query(
    `
    update shopify_webhook_events
    set status = $2
    where webhook_id = $1
    `,
    [webhookId, status]
  );
}
