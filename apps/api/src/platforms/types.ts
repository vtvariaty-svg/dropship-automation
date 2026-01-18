// apps/api/src/platforms/types.ts

export type Platform = "shopify" | "woocommerce" | "mercadolivre" | "shopee" | "amazon";

/**
 * Identidade "interna" do tenant/store no SaaS.
 * - platform: qual conector/adaptador usar
 * - externalId: identificador na plataforma (Shopify = shop domain)
 */
export type TenantRef = {
  tenantId: string;
  platform: Platform;
  externalId: string;
};

export type AccessTokenRecord = {
  accessToken: string;
  scopes?: string | null;
  installedAt?: string | null;
  revokedAt?: string | null;
};

export type OAuthFinalizeInput = {
  externalId: string; // shop domain no caso Shopify
  accessToken: string;
  scopes?: string | null;
};

export type PublishProductInput = {
  externalId: string; // shop domain (Shopify) / storeId (outras)
  accessToken: string;

  title: string;
  descriptionHtml: string;
  images: string[];
  price: number;
};

export type PublishProductResult = {
  externalId: string; // product id na plataforma
  handle?: string;
};

export type EnsureWebhooksInput = {
  externalId: string;
  accessToken: string;
  callbackBaseUrl: string;
};
