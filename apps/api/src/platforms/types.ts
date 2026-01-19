// apps/api/src/platforms/types.ts

export type PlatformKey = "shopify" | "woocommerce" | "shopee" | "custom";

export type AccessTokenRecord = {
  platform: PlatformKey;
  tenantId: string; // no Shopify: o próprio shop (myshopify.com)
  accessToken: string;
  scopes: string; // CSV de scopes
  installedAt?: string; // ISO string (opcional)
  revokedAt?: string | null; // ISO string (opcional)
};

export type VerifyHmacInput = {
  query: Record<string, any>;
  secret: string;
};

export type OAuthInstallUrlInput = {
  shop: string;
  clientId: string;
  scopes: string;
  redirectUri: string;
  state: string;
};

export type ExchangeTokenInput = {
  shop: string;
  clientId: string;
  clientSecret: string;
  code: string;
};

export type ExchangeTokenResult = {
  accessToken: string;
  scopes: string; // Shopify devolve "scope" (singular) no OAuth, mas aqui normalizamos para scopes (string)
};

export type VerifyWebhookInput = {
  rawBody: string;
  signatureHeader: string;
  secret: string;
};

export type EnsureWebhooksArgs = {
  shop: string;
  accessToken: string;
  webhookUrlBase: string; // ex: https://seu-backend.onrender.com
};

export type EnsureWebhooksResult = {
  ok: boolean;
  created?: string[];
  errors?: Array<{ topic?: string; message: string }>;
};

export type PublishProductInput = {
  shop: string;
  accessToken: string;
  title: string;
  descriptionHtml?: string;
};

export type PublishProductResult = {
  ok: boolean;
  externalId: string; // id do produto na plataforma
  handle?: string;
  cleaned?: boolean;
};
