// apps/api/src/platforms/shopify/shopifyAdapter.ts
import type { PlatformAdapter } from "../adapter";
import type {
  EnsureWebhooksInput,
  OAuthFinalizeInput,
  PublishProductInput,
  PublishProductResult,
} from "../types";

import { env } from "../../env";
import { normalizeShop, verifyWebhookHmac, finalizeInstall } from "../../integrations/shopify/oauth";
import { cleanupShopOnUninstall, getShopToken } from "../../integrations/shopify/store";
import { ShopifyAdminClient } from "../../integrations/shopify/adminClient";
import { ensureCoreWebhooks } from "../../integrations/shopify/webhookRegistrar";
import { publishProductToShopify } from "../../integrations/shopify/publishProduct";

/**
 * ShopifyAdapter: encapsula detalhes do conector Shopify.
 * Multi-plataforma: core fala com PlatformAdapter; Shopify é só uma implementação.
 */
export const shopifyAdapter: PlatformAdapter = {
  platform: "shopify",

  normalizeExternalId(input: string): string {
    return normalizeShop(input);
  },

  verifyWebhookSignature(args: { rawBody: string; signatureHeader: string; secret: string }): boolean {
    return verifyWebhookHmac(args.rawBody, args.signatureHeader, args.secret);
  },

  async finalizeOAuthInstall(input: OAuthFinalizeInput): Promise<void> {
    // Persistência + registro de webhooks (já existe no fluxo atual)
    await finalizeInstall({
      shop: input.externalId,
      accessToken: input.accessToken,
      scopes: input.scopes ?? null,
    });
  },

  async cleanupOnUninstall(args: { externalId: string }): Promise<{ cleaned: boolean }> {
    // Idempotente: se não existir token, não falha.
    // (a implementação real está em integrations/shopify/store.ts)
    await cleanupShopOnUninstall(args.externalId);
    return { cleaned: true };
  },

  async ensureCoreWebhooks(input: EnsureWebhooksInput): Promise<void> {
    const client = new ShopifyAdminClient({
      shop: input.externalId,
      accessToken: input.accessToken,
    });

    await ensureCoreWebhooks({
      client,
      callbackBaseUrl: input.callbackBaseUrl || env.BASE_URL,
    });
  },

  async publishProduct(input: PublishProductInput): Promise<PublishProductResult> {
    const created = await publishProductToShopify({
      shop: input.externalId,
      accessToken: input.accessToken,
      title: input.title,
      descriptionHtml: input.descriptionHtml,
      images: input.images,
      price: input.price,
    });

    return { externalId: created.id, handle: created.handle };
  },

  async getAccessToken(args: { externalId: string }) {
    const token = await getShopToken(args.externalId);
    if (!token) return null;

    return {
      accessToken: token.accessToken,
      scopes: token.scopes ?? null,
      // Não temos essas colunas/contrato no store atual.
      // Mantemos null aqui para compatibilidade multi-plataforma sem forçar schema agora.
      installedAt: null,
      revokedAt: null,
    };
  },
};
