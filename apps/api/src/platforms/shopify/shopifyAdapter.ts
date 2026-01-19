import { PlatformAdapter } from "../adapter";
import { PublishProductInput } from "../types";

import { publishProductToShopify } from "../../integrations/shopify/publishProduct";
import { ensureCoreWebhooks } from "../../integrations/shopify/webhookRegistrar";
import { verifyHmac } from "../../integrations/shopify/oauth";

/**
 * Shopify Platform Adapter
 * Contrato REAL do projeto (alinhado ao ZIP)
 */
export const shopifyAdapter: PlatformAdapter = {
  platform: "shopify",

  async publishProduct(input: PublishProductInput) {
    const result = await publishProductToShopify({
      shop: input.externalId,
      accessToken: input.accessToken,
      title: input.title,
      descriptionHtml: input.descriptionHtml,
      images: input.images,
      price: input.price,
    });

    return {
      id: result.id,
      handle: result.handle,
    };
  },

  async ensureWebhooks(params: {
    shop: string;
    accessToken: string;
    callbackBaseUrl: string;
  }): Promise<void> {
    await ensureCoreWebhooks({
      shop: params.shop,
      accessToken: params.accessToken,
      callbackBaseUrl: params.callbackBaseUrl,
    });
  },

  verifyWebhookSignature(args: {
    rawBody: string;
    signatureHeader: string;
    secret: string;
  }): boolean {
    return verifyHmac({
      rawBody: args.rawBody,
      hmacHeader: args.signatureHeader,
      secret: args.secret,
    });
  },

  async cleanupOnUninstall(): Promise<{ cleaned: boolean }> {
    return { cleaned: true };
  },
};
