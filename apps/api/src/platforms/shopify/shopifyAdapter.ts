import {
  PlatformAdapter,
  ExchangeTokenInput,
  ExchangeTokenResult,
  VerifyWebhookInput,
  PublishProductInput,
  PublishProductResult,
  CleanupResult,
} from '../types';

import {
  verifyWebhookHmac,
} from '../../integrations/shopify/oauth';

export class ShopifyAdapter implements PlatformAdapter {
  async exchangeToken(
    input: ExchangeTokenInput
  ): Promise<ExchangeTokenResult> {
    // OAuth já implementado — aqui apenas retorna contrato
    return {
      accessToken: 'ACCESS_TOKEN',
      scopes: 'read_products,write_products',
    };
  }

  verifyWebhook(input: VerifyWebhookInput): boolean {
    return verifyWebhookHmac(
      input.rawBody,
      input.signatureHeader,
      input.secret
    );
  }

  async publishProduct(
    input: PublishProductInput
  ): Promise<PublishProductResult> {
    return {
      externalId: 'shopify-product-id',
      handle: 'product-handle',
    };
  }

  async cleanupShop(shop: string): Promise<CleanupResult> {
    return {
      ok: true,
      deleted: true,
    };
  }
}
