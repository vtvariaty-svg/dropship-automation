import "fastify";

export type ShopContext = {
  shop: string;
  accessToken: string;
};

export type TenantRef = {
  tenantId: string;
  platform: "shopify" | "woocommerce" | "mercadolivre" | "shopee" | "amazon";
  externalId: string;
};

declare module "fastify" {
  interface FastifyRequest {
    shopContext?: ShopContext;
    /** Canonical tenant reference (prepara multi-plataforma) */
    tenant?: TenantRef;
    /** Shop domain encontrado na request (Shopify) */
    shopDomain?: string;
  }
}
