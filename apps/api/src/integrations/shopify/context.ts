import { pool } from "../../db/pool";

export type ShopContext = {
  shop: string;
  accessToken: string;
};

function normalizeShop(input: string): string {
  // remove espaços e força lowercase
  let s = (input ?? "").toString().trim().toLowerCase();

  // se vier URL, extrai host
  // ex: https://cliquebuy-dev.myshopify.com/admin -> cliquebuy-dev.myshopify.com
  try {
    if (s.startsWith("http://") || s.startsWith("https://")) {
      s = new URL(s).host.toLowerCase();
    }
  } catch {
    // ignore
  }

  // remove barra final se vier como host/
  s = s.replace(/\/+$/, "");

  return s;
}

export async function loadShopContext(shop: string): Promise<ShopContext> {
  const normalized = normalizeShop(shop);

  const result = await pool.query(
    `
    select shop, access_token
    from shopify_oauth
    where lower(shop) = lower($1)
    limit 1
  `,
    [normalized]
  );

  if (result.rowCount === 0) {
    throw new Error(`Shop not connected: ${normalized}`);
  }

  return {
    shop: result.rows[0].shop,
    accessToken: result.rows[0].access_token,
  };
}
