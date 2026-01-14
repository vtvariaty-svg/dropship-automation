import { pool } from "../../db/pool";

/**
 * Persistência mínima para tokens de lojas Shopify.
 *
 * Tabela esperada (Postgres):
 *   shopify_oauth(
 *     shop text primary key,
 *     access_token text not null,
 *     scope text,
 *     installed_at timestamptz not null default now()
 *   )
 */

export async function saveShopToken(params: {
  shop: string;
  accessToken: string;
  scope?: string | null;
}) {
  const { shop, accessToken, scope } = params;
  await pool.query(
    `
    insert into shopify_oauth (shop, access_token, scope)
    values ($1, $2, $3)
    on conflict (shop)
    do update set access_token = excluded.access_token, scope = excluded.scope
    `,
    [shop, accessToken, scope ?? null]
  );
}

export async function getShopToken(shop: string) {
  const res = await pool.query<{
    shop: string;
    access_token: string;
    scope: string | null;
  }>(`select shop, access_token, scope from shopify_oauth where shop = $1`, [shop]);

  return res.rows[0] ?? null;
}
