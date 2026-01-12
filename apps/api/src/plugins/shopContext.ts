import { FastifyInstance, FastifyRequest } from "fastify";
import { loadShopContext, ShopContext } from "../integrations/shopify/context";

declare module "fastify" {
  interface FastifyRequest {
    shopContext?: ShopContext;
    shopContextError?: string;
  }
}

function normalizeShop(input: unknown): string {
  let s = String(input ?? "").trim().toLowerCase();

  // Se vier URL completa, extrai host
  try {
    if (s.startsWith("http://") || s.startsWith("https://")) {
      s = new URL(s).host.toLowerCase();
    }
  } catch {
    // ignore
  }

  // remove barras finais
  s = s.replace(/\/+$/, "");
  return s;
}

export async function shopContextPlugin(app: FastifyInstance) {
  app.addHook("preHandler", async (req: FastifyRequest) => {
    // Fonte 1: query ?shop=
    const shopFromQuery = (req.query as any)?.shop;
    // Fonte 2: header oficial Shopify
    const shopFromHeader = req.headers["x-shopify-shop-domain"];

    const shopRaw = shopFromQuery ?? shopFromHeader;
    const shop = normalizeShop(shopRaw);

    // Se não tem shop, não injeta contexto (rota pública)
    if (!shop) return;

    try {
      req.shopContext = await loadShopContext(shop);
      req.shopContextError = undefined;
    } catch (e: any) {
      req.shopContext = undefined;
      req.shopContextError = String(e?.message ?? e);
      // Loga no Render (essencial para diagnóstico)
      req.log.warn({ shop, err: req.shopContextError }, "shopContext: failed to load");
    }
  });
}
