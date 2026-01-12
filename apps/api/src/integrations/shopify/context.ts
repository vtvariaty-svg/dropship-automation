import { pool } from "../../db/pool";

export type ShopContext = {
  shop: string;
  accessToken: string;
};

export async function loadShopContext(shop: string): Promise<ShopContext> {
  const result = await pool.query(
    `
    select shop, access_token
    from shopify_oauth
    where shop = $1
  `,
    [shop]
  );

  if (result.rowCount === 0) {
    throw new Error("Shop not connected");
  }

  return {
    shop: result.rows[0].shop,
    accessToken: result.rows[0].access_token,
  };
}
