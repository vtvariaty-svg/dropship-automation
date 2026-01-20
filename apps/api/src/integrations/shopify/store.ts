// apps/api/src/integrations/shopify/store.ts
import { pool } from "../../db/pool";

export type ShopifyTokenRow = {
  shop: string;
  access_token: string;
  scopes: string;
};

export async function getShopToken(
  shop: string
): Promise<ShopifyTokenRow | null> {
  const { rows } = await pool.query<ShopifyTokenRow>(
    `
    SELECT
      shop,
      access_token,
      scopes
    FROM shopify_oauth
    WHERE shop = $1
    LIMIT 1
    `,
    [shop]
  );

  return rows[0] ?? null;
}

export async function saveShopToken(params: {
  shop: string;
  accessToken: string;
  scopes: string;
}): Promise<void> {
  await pool.query(
    `
    INSERT INTO shopify_oauth (shop, access_token, scopes)
    VALUES ($1, $2, $3)
    ON CONFLICT (shop)
    DO UPDATE SET
      access_token = EXCLUDED.access_token,
      scopes = EXCLUDED.scopes
    `,
    [params.shop, params.accessToken, params.scopes]
  );
}
