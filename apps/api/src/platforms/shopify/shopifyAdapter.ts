import type { PlatformAdapter } from "../adapter";
import type {
  ExchangeTokenInput,
  ExchangeTokenResult,
  EnsureWebhooksArgs,
  PublishProductInput,
  PublishProductResult,
  VerifyWebhookInput,
} from "../types";

import { env } from "../../env";
import { createShopifyAdminClient } from "../../integrations/shopify/client";
import {
  exchangeCodeForToken,
  verifyHmac,
  verifyWebhookHmac,
} from "../../integrations/shopify/oauth";
import {
  cleanupShopOnUninstall,
  getShopToken,
  saveShopToken,
} from "../../integrations/shopify/store";
import { ensureCoreWebhooks } from "../../integrations/shopify/webhookRegistrar";
import { publishProductToShopify } from "../../integrations/shopify/publishProduct";

export const shopifyAdapter: PlatformAdapter = {
  id: "shopify",

  async exchangeToken(input: ExchangeTokenInput): Promise<ExchangeTokenResult> {
    // input.requestedScopesCsv é o contrato novo do adapter
    const requestedScopesCsv = input.requestedScopesCsv ?? "";

    // HMAC da URL do /install e /callback (Shopify OAuth)
    const hmacOk = verifyHmac({
      query: input.query,
      clientSecret: env.SHOPIFY_CLIENT_SECRET,
    });

    if (!hmacOk) {
      return { ok: false, reason: "invalid_hmac" };
    }

    const tokenRes = await exchangeCodeForToken({
      shop: input.shop,
      code: input.code,
      clientId: env.SHOPIFY_CLIENT_ID,
      clientSecret: env.SHOPIFY_CLIENT_SECRET,
      redirectUri: input.redirectUri,
    });

    // tokenRes.accessToken e tokenRes.scopes são o contrato do oauth.ts
    await saveShopToken({
      shop: input.shop,
      accessToken: tokenRes.accessToken,
      scopes: tokenRes.scopes ?? requestedScopesCsv,
    });

    return {
      ok: true,
      accessToken: tokenRes.accessToken,
      scopesCsv: tokenRes.scopes ?? requestedScopesCsv,
    };
  },

  async getToken(shop: string) {
    return getShopToken(shop);
  },

  async ensureWebhooks(args: EnsureWebhooksArgs) {
    const client = createShopifyAdminClient({
      shop: args.shop,
      accessToken: args.accessToken,
    });

    await ensureCoreWebhooks({
      client,
      callbackBaseUrl: args.callbackUrlBase,
    });

    return { ok: true };
  },

  async verifyWebhookSignature(input: VerifyWebhookInput) {
    // contrato do VerifyWebhookInput: rawBody + signatureHeader
    return verifyWebhookHmac({
      rawBody: input.rawBody,
      hmacHeader: input.signatureHeader,
      secret: env.SHOPIFY_WEBHOOK_SECRET,
    });
  },

  async cleanupOnUninstall(shop: string) {
    // store.ts deve retornar { deleted: boolean } ou similar
    const res = await cleanupShopOnUninstall(shop);
    return { ok: true, deleted: Boolean((res as any)?.deleted ?? true) };
  },

  async publishProduct(input: PublishProductInput): Promise<PublishProductResult> {
    const res = await publishProductToShopify({
      shop: input.shop,
      accessToken: input.accessToken,
      title: input.title,
      descriptionHtml: input.descriptionHtml ?? "",
      images: input.images ?? [],
      price: input.price ?? 0,
    });

    // contrato do PublishProductResult: externalId + handle
    return { externalId: res.externalId, handle: res.handle };
  },
};
