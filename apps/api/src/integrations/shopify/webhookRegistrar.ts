import { env } from "../../env";
import { createAdminClient } from "./adminClient";

export type WebhookTopic =
  | "app/uninstalled"
  | "orders/create"
  | "orders/updated"
  | "orders/paid"
  | "orders/cancelled"
  | "fulfillments/create"
  | "fulfillments/update"
  | "products/create"
  | "products/update"
  | "products/delete";

export type WebhookRegistration = {
  topic: WebhookTopic;
  address: string;
};

export function buildWebhookCallbackUrl(): string {
  // endpoint do seu backend que recebe webhooks
  // (POST /shopify/webhooks)
  return `${env.BASE_URL}/shopify/webhooks`;
}

async function registerWebhook(opts: {
  shop: string;
  accessToken: string;
  topic: WebhookTopic;
  address: string;
}): Promise<void> {
  const admin = createAdminClient({
    shop: opts.shop,
    accessToken: opts.accessToken,
  });

  // REST create webhook
  await admin.rest("/webhooks.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      webhook: {
        topic: opts.topic,
        address: opts.address,
        format: "json",
      },
    }),
  });
}

export async function registerDefaultWebhooks(opts: {
  shop: string;
  accessToken: string;
}): Promise<{ ok: true; registered: WebhookRegistration[] }> {
  const address = buildWebhookCallbackUrl();

  // escolha o conjunto mínimo pra dropshipping / automação
  const topics: WebhookTopic[] = [
    "app/uninstalled",
    "orders/create",
    "orders/updated",
    "orders/paid",
    "orders/cancelled",
    "fulfillments/create",
    "fulfillments/update",
    "products/create",
    "products/update",
    "products/delete",
  ];

  const registered: WebhookRegistration[] = [];
  for (const topic of topics) {
    await registerWebhook({
      shop: opts.shop,
      accessToken: opts.accessToken,
      topic,
      address,
    });
    registered.push({ topic, address });
  }

  return { ok: true, registered };
}
