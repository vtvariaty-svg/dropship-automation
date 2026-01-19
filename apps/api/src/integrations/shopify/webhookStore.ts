// apps/api/src/integrations/shopify/webhookStore.ts

import { q } from "../../db/pool";

export type WebhookInsert = {
  webhook_id: string;
  shop: string;
  topic: string;
  status: string;

  // padrão atual
  payload?: any;
  payloadRaw?: string | null;

  // compat caso algum código esteja usando nomes antigos
  body?: any;
  rawBody?: string | null;

  headers?: Record<string, string | string[] | undefined> | null;
};

export async function insertWebhookEvent(e: WebhookInsert): Promise<void> {
  const payload = e.payload ?? e.body ?? null;
  const payloadRaw = e.payloadRaw ?? e.rawBody ?? null;

  await q(
    `
    insert into shopify_webhook_events
      (webhook_id, shop, topic, status, payload, payload_raw, headers)
    values
      ($1, $2, $3, $4, $5, $6, $7)
    on conflict (webhook_id) do nothing
    `,
    [
      e.webhook_id,
      e.shop.toLowerCase(),
      e.topic,
      e.status,
      payload,
      payloadRaw,
      e.headers ? JSON.stringify(e.headers) : null,
    ]
  );
}
