import type { FastifyInstance } from "fastify";
import { env } from "../env";
import { q } from "../db/pool";
import { randomState, verifyHmac, buildInstallUrl } from "../integrations/shopify/oauth";
import { exchangeCodeForToken } from "../integrations/shopify/token";
import { upsertShopifyConnection } from "../integrations/shopify/store";

const TENANT_ID = 1;

/** Aceita apenas *.myshopify.com (dev store). */
function normalizeShop(raw: string) {
  const shop = String(raw ?? "").trim().toLowerCase();
  if (!shop) return null;
  // padrão Shopify: subdomínio + .myshopify.com
  const ok = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop);
  return ok ? shop : null;
}

/**
 * SHOP CONTEXT LOADER
 * - extrai shop
 * - puxa token salvo no Postgres
 * - retorna contexto mínimo para chamadas Admin API
 */
async function loadShopContext(req: any) {
  const qy = (req.query ?? {}) as any;

  // prioridade: query ?shop=
  const shop = normalizeShop(qy.shop ?? "");
  if (!shop) {
    throw Object.assign(new Error("Missing/invalid shop. Use ?shop=*.myshopify.com"), {
      statusCode: 400,
    });
  }

  // IMPORTANTE:
  // Este SELECT assume que seu migration criou a tabela `shopify_connections`
  // com coluna `shop` e `access_token`.
  // Isso é coerente com `upsertShopifyConnection()`.
  const rows = await q<any>(
    `SELECT tenant_id, shop, access_token, scope, refresh_token, expires_at
     FROM shopify_connections
     WHERE shop=$1
     ORDER BY tenant_id ASC
     LIMIT 1`,
    [shop]
  );

  const row = rows[0];
  if (!row?.access_token) {
    throw Object.assign(new Error("Shop not connected (missing access_token). Run /shopify/auth first."), {
      statusCode: 401,
    });
  }

  return {
    tenantId: Number(row.tenant_id ?? TENANT_ID),
    shop: String(row.shop),
    accessToken: String(row.access_token),
    scope: String(row.scope ?? ""),
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
  };
}

/** Client simples para Admin API (GraphQL). */
async function shopifyGraphQL(opts: { shop: string; accessToken: string; query: string; variables?: any }) {
  const apiVersion = (env.SHOPIFY_API_VERSION ?? "2024-10").trim();
  const url = `https://${opts.shop}/admin/api/${apiVersion}/graphql.json`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": opts.accessToken,
    },
    body: JSON.stringify({ query: opts.query, variables: opts.variables ?? {} }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      json?.errors?.[0]?.message ||
      json?.error ||
      `Shopify GraphQL error (HTTP ${res.status})`;
    throw Object.assign(new Error(msg), { statusCode: 502, details: json });
  }

  if (json?.errors?.length) {
    throw Object.assign(new Error(json.errors[0]?.message ?? "Shopify GraphQL error"), {
      statusCode: 502,
      details: json,
    });
  }

  return json;
}

export async function shopifyRoutes(app: FastifyInstance) {
  /**
   * OAuth start
   * GET /shopify/auth?shop=xxx.myshopify.com
   */
  app.get("/shopify/auth", async (req, reply) => {
    const shop = normalizeShop(String((req.query as any).shop ?? ""));
    if (!shop) {
      return reply.code(400).send({ ok: false, error: "Invalid shop. Use *.myshopify.com" });
    }

    const state = randomState();

    reply.setCookie("shopify_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    // Render base
    const redirectUri = `${env.BASE_URL}/shopify/callback`;
    const url = buildInstallUrl({ shop, state, redirectUri });

    return reply.redirect(url);
  });

  /**
   * OAuth callback
   * GET /shopify/callback?shop=&code=&hmac=&state=&host=&timestamp=
   */
  app.get("/shopify/callback", async (req, reply) => {
    const qy = req.query as any;

    // Se o usuário abrir essa URL "na mão", não terá query => invalid hmac.
    if (!verifyHmac(qy)) {
      return reply.code(400).send({ ok: false, error: "Invalid HMAC" });
    }

    const shop = normalizeShop(String(qy.shop ?? ""));
    const code = String(qy.code ?? "");
    const state = String(qy.state ?? "");
    const host = String(qy.host ?? "");

    if (!shop || !code) {
      return reply.code(400).send({ ok: false, error: "Missing shop/code" });
    }

    const cookieState = (req.cookies as any).shopify_oauth_state;
    if (!cookieState || cookieState !== state) {
      return reply.code(400).send({ ok: false, error: "Invalid state" });
    }

    const tok = await exchangeCodeForToken({ shop, code });

    const expiresAt =
      typeof tok.expires_in === "number" ? new Date(Date.now() + tok.expires_in * 1000) : null;

    await upsertShopifyConnection({
      tenantId: TENANT_ID,
      shop,
      scope: tok.scope ?? env.SHOPIFY_SCOPES,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token ?? null,
      expiresAt,
    });

    // ✅ IMPORTANTE:
    // Para não ficar exibindo JSON dentro do Admin, redirecionamos para "/"
    // preservando shop/host/embedded.
    const redirect = `/?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(host)}&embedded=1`;
    return reply.redirect(redirect);
  });

  /**
   * ✅ Primeiro endpoint real usando Shop Context Loader:
   * GET /shopify/products?shop=xxx.myshopify.com
   */
  app.get("/shopify/products", async (req, reply) => {
    try {
      const ctx = await loadShopContext(req);

      const query = `
        query Products($first: Int!) {
          products(first: $first) {
            nodes {
              id
              title
              handle
              status
              totalInventory
            }
          }
        }
      `;

      const data = await shopifyGraphQL({
        shop: ctx.shop,
        accessToken: ctx.accessToken,
        query,
        variables: { first: 20 },
      });

      return reply.send({
        ok: true,
        shop: ctx.shop,
        products: data.data?.products?.nodes ?? [],
      });
    } catch (err: any) {
      const code = Number(err?.statusCode ?? 500);
      return reply.code(code).send({
        ok: false,
        error: err?.message ?? "Unknown error",
        details: err?.details ?? null,
      });
    }
  });
}
