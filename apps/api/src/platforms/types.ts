export type Platform = 'shopify' | 'woocommerce' | 'shopee';

export interface ShopToken {
  shop: string;
  accessToken: string;
  scopes: string;
  installedAt: Date;
  revokedAt?: Date | null;
}

export interface ExchangeTokenInput {
  shop: string;
  code: string;
}

export interface ExchangeTokenResult {
  accessToken: string;
  scopes: string;
}

export interface VerifyWebhookInput {
  rawBody: string;
  signatureHeader: string;
  secret: string;
}

export interface PublishProductInput {
  shop: string;
  title: string;
  price: number;
}

export interface PublishProductResult {
  externalId: string;
  handle: string;
}

export interface CleanupResult {
  ok: boolean;
  deleted: boolean;
}

export interface PlatformAdapter {
  exchangeToken(input: ExchangeTokenInput): Promise<ExchangeTokenResult>;
  verifyWebhook(input: VerifyWebhookInput): boolean;
  publishProduct(input: PublishProductInput): Promise<PublishProductResult>;
  cleanupShop(shop: string): Promise<CleanupResult>;
}
