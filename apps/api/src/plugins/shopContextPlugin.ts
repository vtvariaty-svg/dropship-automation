// apps/api/src/plugins/shopContextPlugin.ts
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

import { resolveShopifyTenant } from "../tenancy/tenant";

const plugin: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", async (req) => {
    const headerShop = req.headers["x-shopify-shop-domain"];
    const qShop = (req.query as any)?.shop;

    const shop =
      (typeof headerShop === "string" && headerShop) ||
      (typeof qShop === "string" && qShop) ||
      undefined;

    req.shopDomain = shop;

    // Prepara multi-tenant (hoje: Shopify). No futuro, o tenant virá do session token.
    if (shop) {
      req.tenant = resolveShopifyTenant(shop);
    }
  });
};

export default fp(plugin);
