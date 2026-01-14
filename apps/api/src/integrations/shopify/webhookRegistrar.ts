import { ShopifyAdminClient, buildWebhookCallbackUrl } from "./adminClient";

/**
 * Opção 1 (recomendada agora): registrar Webhooks via REST Admin API
 * - Simples
 * - Funciona em qualquer app
 * - Fácil de depurar
 */

const CORE_WEBHOOKS = [
  {
    topic: "app/uninstalled",
  },
] as const;

export async function ensureCoreWebhooks(params: {
  shop: string;
  accessToken: string;
}): Promise<{ created: string[]; existing: string[]; callbackUrl: string }> {
  const client = new ShopifyAdminClient({
    shop: params.shop,
    accessToken: params.accessToken,
  });
  const callbackUrl = buildWebhookCallbackUrl();
  const existing = await client.listWebhooks();

  const createdTopics: string[] = [];
  const existingTopics: string[] = [];

  for (const wh of CORE_WEBHOOKS) {
    const already = existing.find((w) => w.topic === wh.topic && w.address === callbackUrl);
    if (already) {
      existingTopics.push(wh.topic);
      continue;
    }

    await client.createWebhook({
      topic: wh.topic,
      address: callbackUrl,
    });
    createdTopics.push(wh.topic);
  }

  return { created: createdTopics, existing: existingTopics, callbackUrl };
}
