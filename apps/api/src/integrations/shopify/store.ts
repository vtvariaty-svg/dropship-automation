import { pool } from "../db/pool";

export async function upsertShopifyConnection(params: {
  shop: string;
  accessToken: string;
  scopes: string;
}) {
  const { shop, accessToken, scopes } = params;

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
    [shop, accessToken, scopes]
  );
}
