import { pool } from "../../db/pool";

export interface ShopTokenRow {
  shop: string;
  access_token: string;
  scopes: string;
}

export async function saveShopToken(args: {
  shop: string;
  accessToken: string;
  scopes: string | null;
}) {
  await pool.query(
    `
    insert into shopify_oauth (shop, access_token, scopes)
    values ($1, $2, $3)
    on conflict (shop)
    do update set
      access_token = excluded.access_token,
      scopes = excluded.scopes,
      updated_at = now()
    `,
    [args.shop, args.accessToken, args.scopes]
  );
}

export async function getShopToken(shop: string): Promise<ShopTokenRow | null> {
  const res = await pool.query(
    `
    select shop, access_token, scopes
    from shopify_oauth
    where shop = $1
    limit 1
    `,
    [shop]
  );

  return res.rows[0] ?? null;
}

export async function cleanupShopOnUninstall(shop: string) {
  await pool.query(`delete from shopify_oauth where shop = $1`, [shop]);
}
