import crypto from "crypto";
import { saveShopToken } from "./store";

export const adminGraphQLEndpoint = (shop: string) =>
  `https://${shop}/admin/api/2024-01/graphql.json`;

interface ExchangeTokenResult {
  accessToken: string;
  scopes: string | null;
}

export async function exchangeCodeForToken(params: {
  shop: string;
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<ExchangeTokenResult> {
  const tokenUrl = `https://${params.shop}/admin/oauth/access_token`;

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
    }),
  });

  if (!res.ok) {
    throw new Error(`Shopify token exchange failed (${res.status})`);
  }

  const data = (await res.json()) as {
    access_token: string;
    scope?: string;
  };

  return {
    accessToken: String(data.access_token),
    scopes: data.scope ?? null,
  };
}

export async function finalizeInstall(args: {
  shop: string;
  accessToken: string;
  scopes: string | null;
}) {
  await saveShopToken({
    shop: args.shop,
    accessToken: args.accessToken,
    scopes: args.scopes,
  });
}

export function verifyShopifyHmac(params: {
  query: Record<string, string>;
  secret: string;
}): boolean {
  const { hmac, ...rest } = params.query;

  const message = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join("&");

  const generated = crypto
    .createHmac("sha256", params.secret)
    .update(message)
    .digest("hex");

  return generated === hmac;
}
