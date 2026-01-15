// apps/api/src/plugins/shopContextPlugin.ts
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    shopDomain?: string;
  }
}

const plugin: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", async (req) => {
    const headerShop = req.headers["x-shopify-shop-domain"];
    const qShop = (req.query as any)?.shop;

    const shop =
      (typeof headerShop === "string" && headerShop) ||
      (typeof qShop === "string" && qShop) ||
      undefined;

    req.shopDomain = shop;
  });
};

export default fp(plugin);
