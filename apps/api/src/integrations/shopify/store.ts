// apps/api/src/integrations/shopify/store.ts
// Token store (DB) - schema esperado:
//   shopify_oauth(shop text primary key, access_token text not null, scopes text not null, ...)

import { q } from "../../db/pool";

export type ShopTokenRow = {
  shop: string;
  access_token: string;
  scopes: string;
};

export type SaveShopTokenInput = {
  shop: string;
  accessToken: string;

  // compat: pode vir como scope OU scopes
  scope?: string | null;
  scopes?: string | null;
};

export async function saveShopToken(input: SaveShopTokenInput): Promise<void> {
  const shop = input.shop.toLowerCase();
  const scopes = (input.scopes ?? input.scope ?? "").trim();

  // se scopes vier vazio, salva pelo menos string vazia? NÃO. Seu DB está NOT NULL.
  if (!scopes) {
    throw new Error("saveShopToken: scopes is required (DB column shopify_oauth.scopes is NOT NULL)");
  }

  await q(
    `
    insert into shopify_oauth (shop, access_token, scopes)
    values ($1, $2, $3)
    on conflict (shop)
    do update set
      access_token = excluded.access_token,
      scopes = excluded.scopes
    `,
    [shop, input.accessToken, scopes]
  );
}

export async function getShopToken(shop: string): Promise<ShopTokenRow | null> {
  const rows = await q<ShopTokenRow>(
    `select shop, access_token, scopes from shopify_oauth where lower(shop) = lower($1) limit 1`,
    [shop]
  );
  return rows[0] ?? null;
}

export type CleanupResult = { deleted: boolean };

export async function cleanupShopOnUninstall(shop: string): Promise<CleanupResult> {
  const rows = await q<{ shop: string }>(
    `delete from shopify_oauth where lower(shop) = lower($1) returning shop`,
    [shop]
  );

  return { deleted: rows.length > 0 };
}

// alias compat (se algum arquivo ainda estiver chamando deleteShopToken)
export async function deleteShopToken(shop: string): Promise<CleanupResult> {
  return cleanupShopOnUninstall(shop);
}
