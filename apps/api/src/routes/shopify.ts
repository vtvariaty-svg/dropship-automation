// apps/api/src/routes/shopify.ts
import type { FastifyInstance } from "fastify";
import { env } from "../env";
import {
  buildInstallUrl,
  exchangeCodeForToken,
  finalizeInstall,
  normalizeShop,
  randomState,
  verifyHmac,
} from "../integrations/shopify/oauth";

export async function shopifyRoutes(app: FastifyInstance) {
  // GET /shopify/install?shop=xxxxx.myshopify.com
  app.get("/shopify/install", async (req, reply) => {
    const shopRaw = String((req.query as any)?.shop ?? "");
    const shop = normalizeShop(shopRaw);

    console.log(
      JSON.stringify({
        msg: "oauth.install.hit",
        shop,
      })
    );

    if (!shop || !shop.endsWith(".myshopify.com")) {
      return reply.code(400).send({ ok: false, error: "invalid_shop" });
    }

    const state = randomState(16);

    // Redirect URI do callback (precisa ser público e igual ao do Partner Dashboard)
    const redirectUri = `${env.BASE_URL.replace(/\/+$/, "")}/shopify/callback`;

    const installUrl = buildInstallUrl({
      shop,
      state,
      redirectUri,
      scopes: env.SHOPIFY_SCOPES,
      clientId: env.SHOPIFY_CLIENT_ID,
    });

    console.log(
      JSON.stringify({
        msg: "oauth.install.redirect",
        shop,
        redirectUri,
        installUrl,
      })
    );

    return reply.redirect(installUrl);
  });

  // GET /shopify/callback?shop=...&code=...&hmac=...&state=...
  app.get("/shopify/callback", async (req, reply) => {
    const q = req.query as any;

    const shopRaw = String(q?.shop ?? "");
    const shop = normalizeShop(shopRaw);
    const code = String(q?.code ?? "");

    console.log(
      JSON.stringify({
        msg: "oauth.callback.hit",
        shop,
        hasCode: Boolean(code),
        keys: Object.keys(q ?? {}),
      })
    );

    // 1) valida shop + code
    if (!shop || !shop.endsWith(".myshopify.com")) {
      console.log(JSON.stringify({ msg: "oauth.callback.invalid_shop", shop }));
      return reply.code(400).send({ ok: false, error: "invalid_shop" });
    }
    if (!code) {
      console.log(JSON.stringify({ msg: "oauth.callback.missing_code", shop }));
      return reply.code(400).send({ ok: false, error: "missing_code" });
    }

    // 2) valida HMAC
    const hmacOk = verifyHmac({ query: q, clientSecret: env.SHOPIFY_CLIENT_SECRET });
    console.log(JSON.stringify({ msg: "oauth.callback.hmac", shop, ok: hmacOk }));

    if (!hmacOk) {
      return reply.code(400).send({ ok: false, error: "invalid_hmac" });
    }

    // 3) troca code por token
    const tokenRes = await exchangeCodeForToken({
      shop,
      code,
      clientId: env.SHOPIFY_CLIENT_ID,
      clientSecret: env.SHOPIFY_CLIENT_SECRET,
    });

    console.log(
      JSON.stringify({
        msg: "oauth.callback.token_exchanged",
        shop,
        hasToken: Boolean(tokenRes?.access_token),
        scopes: tokenRes?.scopes ?? null,
      })
    );

    // 4) finalizeInstall: salva token + registra webhooks (APP_UNINSTALLED)
    console.log(JSON.stringify({ msg: "oauth.callback.finalize_install_start", shop }));

    await finalizeInstall({
      shop,
      accessToken: tokenRes.access_token,
      scopes: tokenRes.scopes ?? null,
    });

    console.log(JSON.stringify({ msg: "oauth.callback.finalize_install_done", shop }));

    // 5) redirect final (pode ajustar depois)
    return reply.send({
      ok: true,
      shop,
      installed: true,
    });
  });
}
