// apps/api/src/integrations/shopify/store.ts
// Source of truth for Shopify token persistence (Shopify phase 1).
//
// IMPORTANT:
// - The active Neon schema uses table `shopify_oauth` with columns:
//   shop (pk), access_token, scopes, installed_at
// - We keep operations idempotent and case-insensitive on `shop`.

import { pool } from "../../db/pool";

export type ShopTokenRow = {
  shop: string;
  access_token: string;
  scopes: string;
  installed_at: string;
};

export async function saveShopToken(args: {
  shop: string;
  accessToken: string;
  scopes: string;
}): Promise<void> {
  const shop = args.shop.trim();
  const scopes = String(args.scopes || "").trim();

  if (!shop) throw new Error("saveShopToken: shop is required");
  if (!args.accessToken) throw new Error("saveShopToken: accessToken is required");
  if (!scopes) throw new Error("saveShopToken: scopes is required (non-empty)");

  await pool.query(
    `
    insert into shopify_oauth (shop, access_token, scopes, installed_at)
    values ($1, $2, $3, now())
    on conflict (shop)
    do update set
      access_token = excluded.access_token,
      scopes = excluded.scopes,
      installed_at = now()
    `,
    [shop, args.accessToken, scopes]
  );
}

export async function getShopToken(shop: string): Promise<ShopTokenRow | null> {
  const res = await pool.query<ShopTokenRow>(
    `
    select shop, access_token, scopes, installed_at
    from shopify_oauth
    where lower(shop) = lower($1)
    limit 1
    `,
    [shop]
  );

  return res.rows[0] ?? null;
}

// Called on `app/uninstalled` webhook.
// We delete the record so the shop is effectively "revoked".
// Idempotent: if it doesn't exist, returns deleted=0.
export async function cleanupShopOnUninstall(shop: string): Promise<{ deleted: number }> {
  const res = await pool.query(`delete from shopify_oauth where lower(shop) = lower($1)`, [shop]);
  return { deleted: res.rowCount ?? 0 };
}
