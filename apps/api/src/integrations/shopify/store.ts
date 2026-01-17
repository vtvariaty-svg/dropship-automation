// apps/api/src/integrations/shopify/store.ts
import { pool } from "../../db/pool";

/* =====================================================
   TYPES
===================================================== */

export type ShopToken = {
  shop: string;
  accessToken: string;
  scopes: string;
};

export type SaveShopTokenInput = {
  shop: string;
  accessToken: string;
  scopes: string | null;
};

/* =====================================================
   READ
===================================================== */

/**
 * Carrega token ativo da shop
 * (usado por admin routes, adapters, etc)
 */
export async function getShopToken(shop: string): Promise<ShopToken | null> {
  const res = await pool.query(
    `
    select shop, access_token, scopes
    from shopify_oauth
    where lower(shop) = lower($1)
      and access_token <> ''
    limit 1
    `,
    [shop]
  );

  if (res.rowCount === 0) return null;

  return {
    shop: res.rows[0].shop,
    accessToken: res.rows[0].access_token,
    scopes: res.rows[0].scopes,
  };
}

/* =====================================================
   WRITE / UPSERT
===================================================== */

/**
 * Salva ou atualiza token OAuth
 * ⚠ scopes NUNCA pode ser NULL (constraint do DB)
 */
export async function saveShopToken(input: SaveShopTokenInput): Promise<void> {
  const shop = input.shop.toLowerCase().trim();
  const accessToken = String(input.accessToken);
  const scopes = (input.scopes ?? "").trim(); // NOT NULL safeguard

  await pool.query(
    `
    insert into shopify_oauth (shop, access_token, scopes, installed_at, updated_at)
    values ($1, $2, $3, now(), now())
    on conflict (shop)
    do update set
      access_token = excluded.access_token,
      scopes = excluded.scopes,
      updated_at = now()
    `,
    [shop, accessToken, scopes]
  );
}

/* =====================================================
   UNINSTALL / CLEANUP
===================================================== */

/**
 * Limpa token quando app é desinstalado
 * (idempotente)
 */
export async function cleanupShopOnUninstall(shop: string): Promise<void> {
  await pool.query(
    `
    update shopify_oauth
    set access_token = '',
        updated_at = now()
    where lower(shop) = lower($1)
    `,
    [shop]
  );
}
