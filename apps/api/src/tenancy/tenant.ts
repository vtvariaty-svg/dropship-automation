// apps/api/src/tenancy/tenant.ts

export type Platform =
  | "shopify"
  | "woocommerce"
  | "mercadolivre"
  | "shopee"
  | "amazon";

export type TenantRef = {
  tenantId: string;
  platform: Platform;
  externalId: string;
};

export function makeTenantId(platform: Platform, externalId: string): string {
  return `${platform}:${externalId}`;
}

export function normalizeShopifyShopDomain(shop: string): string {
  return shop.trim().toLowerCase();
}

export function resolveShopifyTenant(shop: string): TenantRef {
  const externalId = normalizeShopifyShopDomain(shop);
  return {
    tenantId: makeTenantId("shopify", externalId),
    platform: "shopify",
    externalId,
  };
}
