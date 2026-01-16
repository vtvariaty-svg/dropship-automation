// apps/api/src/integrations/shopify/store.ts
import { pool } from "../../db/pool";

export async function saveShopToken(args: {
  shop: string;
  accessToken: string;
  scope: string | null;
}): Promise<void> {
  const sql = `
    insert into shopify_oauth (shop, access_token, scope, installed_at)
    values ($1, $2, $3, now())
    on conflict (shop)
    do update set
      access_token = excluded.access_token,
      scope = excluded.scope,
      installed_at = now()
  `;
  await pool.query(sql, [args.shop, args.accessToken, args.scope]);
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
 * Cleanup idempotente:
 * - Sempre tenta limpar o token em shopify_oauth.
 * - Rodar N vezes mantém estado correto (token NULL).
 */
export async function cleanupShopOnUninstall(shop: string): Promise<void> {
  await pool.query(
    `
    update shopify_oauth
    set access_token = null,
        scope = null
    where lower(shop) = lower($1)
  `,
    [shop]
  );
}
