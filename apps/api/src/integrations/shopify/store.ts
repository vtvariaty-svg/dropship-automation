// apps/api/src/integrations/shopify/store.ts
import { pool } from "../../db/pool";

export type ShopOAuthRow = {
  shop: string;
  access_token: string;
  scopes: string;
  installed_at?: Date;
  revoked_at?: Date | null;
};

export async function saveShopToken(args: {
  shop: string;
  accessToken: string;
  scopes: string;
}): Promise<void> {
  const sql = `
    insert into shopify_oauth (shop, access_token, scopes, installed_at, revoked_at)
    values ($1, $2, $3, now(), null)
    on conflict (shop)
    do update set access_token = excluded.access_token,
                 scopes = excluded.scopes,
                 installed_at = now(),
                 revoked_at = null
  `;
  await pool.query(sql, [args.shop, args.accessToken, args.scopes]);
}

export async function getShopToken(shop: string): Promise<ShopOAuthRow | null> {
  const sql = `
    select shop, access_token, scopes, installed_at, revoked_at
    from shopify_oauth
    where lower(shop) = lower($1)
    limit 1
  `;
  const res = await pool.query(sql, [shop]);
  return (res.rows?.[0] as ShopOAuthRow) ?? null;
}

/**
 * Mantém histórico de uninstall sem necessariamente apagar a linha.
 * (Você pode trocar para DELETE se preferir.)
 */
export async function cleanupShopOnUninstall(shop: string): Promise<{ deleted: boolean }> {
  const sql = `
    update shopify_oauth
    set access_token = '',
        revoked_at = now()
    where lower(shop) = lower($1)
  `;
  const res = await pool.query(sql, [shop]);
  return { deleted: (res.rowCount || 0) > 0 };
}
