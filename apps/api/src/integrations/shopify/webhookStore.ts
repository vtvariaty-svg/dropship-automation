import { pool } from "../../db/pool";

export type WebhookEventStatus = "received" | "processed" | "failed";

export type WebhookEventInsert = {
  webhookId: string;
  shop: string;
  topic: string;
  apiVersion?: string | null;
  payload: unknown;
  payloadRaw?: string | null;
  headers: Record<string, string | string[] | undefined>;
  status: WebhookEventStatus;
};

export async function insertWebhookEvent(input: WebhookEventInsert): Promise<{
  ok: true;
  id: number | null;
}> {
  const res = await pool.query(
    `
    insert into shopify_webhook_events
      (webhook_id, shop, topic, payload, headers, received_at, status, api_version, payload_raw)
    values
      ($1, $2, $3, $4::jsonb, $5::jsonb, now(), $6, $7, $8)
    returning id;
    `,
    [
      input.webhookId,
      input.shop,
      input.topic,
      JSON.stringify(input.payload ?? {}),
      JSON.stringify(input.headers ?? {}),
      input.status,
      input.apiVersion ?? null,
      input.payloadRaw ?? null,
    ]
  );

  const id = res.rows?.[0]?.id ?? null;
  return { ok: true, id };
}
