// apps/api/src/platforms/shopify/shopifyAdapter.ts
import type { PlatformAdapter } from "../adapter";
import type {
  EnsureWebhooksArgs,
  EnsureWebhooksResult,
  ExchangeTokenInput,
  ExchangeTokenResult,
  OAuthInstallUrlInput,
  PublishProductInput,
  PublishProductResult,
  VerifyHmacInput,
  VerifyWebhookInput,
} from "../types";

import {
  buildInstallUrl,
  exchangeCodeForToken,
  normalizeShop,
  verifyHmac,
  verifyWebhookHmac,
} from "../../integrations/shopify/oauth";

import { ensureShopifyWebhooks } from "../../integrations/shopify/webhookRegistrar";
import { publishProductShopify } from "../../integrations/shopify/publishProduct";

export class ShopifyAdapter implements PlatformAdapter {
  key = "shopify";

  normalizeTenant(input: string): string {
    return normalizeShop(input);
  }

  buildInstallUrl(input: OAuthInstallUrlInput): string {
    return buildInstallUrl(input);
  }

  verifyHmac(input: VerifyHmacInput): boolean {
    return verifyHmac(input.query, input.secret);
  }

  async exchangeCodeForToken(input: ExchangeTokenInput): Promise<ExchangeTokenResult> {
    const r = await exchangeCodeForToken(input);
    return { accessToken: r.accessToken, scopes: r.scopes };
  }

  verifyWebhookHmac(input: VerifyWebhookInput): boolean {
    return verifyWebhookHmac(input.rawBody, input.signatureHeader, input.secret);
  }

  async ensureWebhooks(args: EnsureWebhooksArgs): Promise<EnsureWebhooksResult> {
    return ensureShopifyWebhooks(args);
  }

  async publishProduct(input: PublishProductInput): Promise<PublishProductResult> {
    return publishProductShopify(input);
  }
}
