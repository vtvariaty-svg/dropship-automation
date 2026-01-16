// apps/api/src/integrations/shopify/store.ts
import { pool } from "../../db/pool";

export async function saveShopToken(args: {
  shop: string;
  accessToken: string;
  scopes: string | null;
}): Promise<void> {
  const sql = `
    insert into shopify_oauth (shop, access_token, scopes)
    values ($1, $2, $3)
    on conflict (shop)
    do update set
      access_token = excluded.access_token,
      scopes = excluded.scopes
  `;
  await pool.query(sql, [args.shop, args.accessToken, args.scopes]);
}

export async function getShopToken(shop: string): Promise<string | null> {
  const sql = `
    select access_token
    from shopify_oauth
    where lower(shop) = lower($1)
    limit 1
  `;
  const res = await pool.query(sql, [shop]);
  return res.rows?.[0]?.access_token ?? null;
}

/**
 * Cleanup idempotente para app/uninstalled:
 * Deleta o registro da shop em shopify_oauth.
 * - funciona mesmo se access_token for NOT NULL
 * - reexecuções não falham
 */
export async function cleanupShopOnUninstall(shop: string): Promise<void> {
  await pool.query(
    `delete from shopify_oauth where lower(shop) = lower($1)`,
    [shop]
  );
}
