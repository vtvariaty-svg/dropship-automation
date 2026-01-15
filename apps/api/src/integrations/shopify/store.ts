// apps/api/src/integrations/shopify/store.ts
import { pool } from "../../db/pool";

export type ShopTokenRow = {
  shop: string;
  access_token: string;
  scope: string | null;
  installed_at: Date;
};

export async function saveShopToken(args: {
  shop: string;
  accessToken: string;
  scope: string | null;
}): Promise<void> {
  const sql = `
    insert into shopify_shop_access_tokens (shop, access_token, scope, installed_at)
    values ($1, $2, $3, now())
    on conflict (shop)
    do update set access_token = excluded.access_token,
                 scope = excluded.scope,
                 installed_at = now()
  `;
  await pool.query(sql, [args.shop, args.accessToken, args.scope]);
}

export async function getShopToken(shop: string): Promise<ShopTokenRow | null> {
  const sql = `
    select shop, access_token, scope, installed_at
    from shopify_shop_access_tokens
    where shop = $1
    limit 1
  `;
  const res = await pool.query(sql, [shop]);
  return (res.rows?.[0] as ShopTokenRow) ?? null;
}

export async function deleteShopToken(shop: string): Promise<void> {
  await pool.query(`delete from shopify_shop_access_tokens where shop = $1`, [shop]);
}
