import { pool } from "../../db/pool";

type SaveShopTokenParams = {
  shop: string;
  accessToken: string;
};

export async function saveShopToken(params: SaveShopTokenParams) {
  const { shop, accessToken } = params;

  await pool.query(
    `
    insert into shopify_oauth (shop, access_token)
    values ($1, $2)
    on conflict (shop)
    do update set access_token = excluded.access_token
    `,
    [shop, accessToken]
  );
}
