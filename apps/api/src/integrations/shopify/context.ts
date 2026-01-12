import { pool } from "../../db/pool";

export type ShopContext = {
  shop: string;
  accessToken: string;
};

export async function loadShopContext(shop: string): Promise<ShopContext> {
  const res = await pool.query(
    `
    select shop, access_token
    from shopify_oauth
    where shop = $1
  `,
    [shop]
  );

  if (res.rowCount === 0) {
    throw new Error("Shop not connected");
  }

  return {
    shop: res.rows[0].shop,
    accessToken: res.rows[0].access_token,
  };
}
