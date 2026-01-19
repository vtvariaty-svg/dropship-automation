// apps/api/src/integrations/shopify/webhookStore.ts
import { pool } from "../../db/pool";

export type WebhookEventInsert = {
  webhook_id: string;
  shop: string;
  topic: string;
  status: "received" | "processed" | "failed";
  received_at?: Date;
};

export async function insertWebhookEvent(e: WebhookEventInsert): Promise<void> {
  const sql = `
    insert into shopify_webhook_events (webhook_id, shop, topic, status, received_at)
    values ($1, $2, $3, $4, coalesce($5, now()))
  `;
  await pool.query(sql, [e.webhook_id, e.shop, e.topic, e.status, e.received_at ?? null]);
}
