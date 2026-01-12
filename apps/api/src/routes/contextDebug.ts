import type { FastifyInstance } from "fastify";
import { loadShopContext } from "../integrations/shopify/context";

function normalizeShop(input: unknown): string {
  let s = String(input ?? "").trim().toLowerCase();
  try {
    if (s.startsWith("http://") || s.startsWith("https://")) {
      s = new URL(s).host.toLowerCase();
    }
  } catch {}
  s = s.replace(/\/+$/, "");
  return s;
}

export async function contextDebugRoutes(app: FastifyInstance) {
  app.get("/__debug/context", async (req, reply) => {
    const shopFromQuery = (req.query as any)?.shop;
    const shopFromHeader = req.headers["x-shopify-shop-domain"];
    const shopNormalized = normalizeShop(shopFromQuery ?? shopFromHeader);

    // Lookup direto (independente do plugin), sem vazar token
    let directLookup: any = null;
    try {
      if (shopNormalized) {
        const ctx = await loadShopContext(shopNormalized);
        directLookup = {
          ok: true,
          shop: ctx.shop,
          tokenPrefix: ctx.accessToken.slice(0, 8),
        };
      } else {
        directLookup = { ok: false, error: "missing shop" };
      }
    } catch (e: any) {
      directLookup = { ok: false, error: String(e?.message ?? e) };
    }

    return reply.send({
      ok: Boolean(req.shopContext),
      context: req.shopContext
        ? { shop: req.shopContext.shop, tokenPrefix: req.shopContext.accessToken.slice(0, 8) }
        : null,
      shopFromQuery: shopFromQuery ?? null,
      shopFromHeader: shopFromHeader ?? null,
      shopNormalized: shopNormalized || null,
      pluginError: req.shopContextError ?? null,
      directLookup,
    });
  });
}
