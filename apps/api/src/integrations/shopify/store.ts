import { pool } from "../db/pool";

export async function saveShopToken(params: {
  shop: string;
  accessToken: string;
  scope: string;
}) {
  const { shop, accessToken, scope } = params;

  await pool.query(
    `
    insert into shopify_stores (shop, access_token, scope, updated_at)
    values ($1, $2, $3, now())
    on conflict (shop)
    do update set
      access_token = excluded.access_token,
      scope = excluded.scope,
      updated_at = now()
  `,
    [shop, accessToken, scope]
  );

  return { shop, connected: true };
}
