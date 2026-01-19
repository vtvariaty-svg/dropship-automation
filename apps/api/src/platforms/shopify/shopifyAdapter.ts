import { PlatformAdapter } from "../adapter";
import {
  PublishProductInput,
  PublishProductResult,
  VerifyWebhookInput,
  CleanupResult,
} from "../types";

import { publishProductToShopify } from "../../integrations/shopify/publishProduct";
import { ensureCoreWebhooks } from "../../integrations/shopify/webhookRegistrar";
import { verifyWebhookHmac } from "../../integrations/shopify/oauth";
import { createShopifyAdminClient } from "../../integrations/shopify/client";

/**
 * Shopify Platform Adapter
 * - Implementa o contrato PlatformAdapter
 * - Não acopla OAuth, rotas ou DB
 * - Apenas traduz chamadas genéricas -> Shopify
 */
export const shopifyAdapter: PlatformAdapter = {
  platform: "shopify",

  /**
   * Publicação de produto
   */
  async publishProduct(
    input: PublishProductInput
  ): Promise<PublishProductResult> {
    const result = await publishProductToShopify({
      shop: input.externalId,
      accessToken: input.accessToken,
      title: input.title,
      descriptionHtml: input.descriptionHtml,
      images: input.images,
      price: input.price,
    });

    return {
      externalProductId: result.externalProductId,
      platform: "shopify",
      raw: result.raw,
    };
  },

  /**
   * Registro / garantia de webhooks essenciais
   */
  async ensureWebhooks(params: {
    shop: string;
    accessToken: string;
    callbackBaseUrl: string;
  }): Promise<void> {
    const client = createShopifyAdminClient({
      shop: params.shop,
      accessToken: params.accessToken,
    });

    await ensureCoreWebhooks({
      client,
      callbackBaseUrl: params.callbackBaseUrl,
    });
  },

  /**
   * Verificação de assinatura de webhook
   */
  async verifyWebhookSignature(
    input: VerifyWebhookInput
  ): Promise<boolean> {
    return verifyWebhookHmac({
      rawBody: input.rawBody,
      hmacHeader: input.signatureHeader,
    });
  },

  /**
   * Limpeza após uninstall
   * (DB, cache, tokens, etc — hoje apenas confirmação lógica)
   */
  async cleanupOnUninstall(): Promise<CleanupResult> {
    return {
      cleaned: true,
    };
  },
};
