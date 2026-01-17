// apps/api/src/integrations/shopify/store.ts
import { pool } from "../../db/pool";

export type SaveShopTokenInput = {
  shop: string;
  accessToken: string;
  scopes: string | null;
};

export async function saveShopToken(input: SaveShopTokenInput): Promise<void> {
  const shop = String(input.shop).toLowerCase().trim();
  const accessToken = String(input.accessToken);

  // ✅ DB tem NOT NULL em scopes → nunca permitir null
  const scopes = (input.scopes ?? "").trim();

  await pool.query(
    `
    insert into shopify_oauth (shop, access_token, scopes, installed_at, updated_at)
    values ($1, $2, $3, now(), now())
    on conflict (shop)
    do update set
      access_token = excluded.access_token,
      scopes = excluded.scopes,
      updated_at = now()
    `,
    [shop, accessToken, scopes]
  );
}

export async function disableShopToken(args: { shop: string }): Promise<void> {
  const shop = String(args.shop).toLowerCase().trim();

  // ✅ “desinstalado” = token desativado (não deletar histórico)
  await pool.query(
    `
    update shopify_oauth
    set access_token = '',
        updated_at = now()
    where lower(shop) = lower($1)
    `,
    [shop]
  );
}
