// apps/api/src/integrations/shopify/store.ts
import { pool } from "../../db/pool";

export async function saveShopToken(args: {
  shop: string;
  accessToken: string;
  scopes: string | null;
}): Promise<void> {
  const sql = `
    insert into shopify_oauth (shop, access_token, scopes, installed_at)
    values ($1, $2, $3, now())
    on conflict (shop)
    do update set
      access_token = excluded.access_token,
      scopes = excluded.scopes,
      installed_at = now()
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
 * - access_token -> NULL
 * - scopes -> NULL
 */
export async function cleanupShopOnUninstall(shop: string): Promise<void> {
  await pool.query(
    `
    update shopify_oauth
    set access_token = null,
        scopes = null
    where lower(shop) = lower($1)
  `,
    [shop]
  );
}
