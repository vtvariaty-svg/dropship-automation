// apps/api/src/integrations/shopify/store.ts
import { pool } from "../../db/pool";

export type ShopOAuthRow = {
  shop: string;
  access_token: string;
  scopes: string;
};

/**
 * Salva/atualiza token da loja.
 * IMPORTANTE: não referenciar colunas que não existem no Neon (ex.: installed_at).
 */
export async function saveShopToken(args: {
  shop: string;
  accessToken: string;
  scopes: string;
}): Promise<void> {
  const sql = `
    insert into shopify_oauth (shop, access_token, scopes)
    values ($1, $2, $3)
    on conflict (shop)
    do update set
      access_token = excluded.access_token,
      scopes = excluded.scopes
  `;
  await pool.query(sql, [args.shop, args.accessToken, args.scopes]);
}

/**
 * Busca token da loja.
 * IMPORTANTE: não referenciar colunas que não existem (ex.: installed_at).
 */
export async function getShopToken(shop: string): Promise<ShopOAuthRow | null> {
  const sql = `
    select shop, access_token, scopes
    from shopify_oauth
    where lower(shop) = lower($1)
    limit 1
  `;
  const res = await pool.query(sql, [shop]);
  return (res.rows?.[0] as ShopOAuthRow) ?? null;
}

/**
 * Chamado no webhook app/uninstalled.
 * Estratégia mais segura (compatível com schema mínimo): remove o registro da loja.
 * Isso evita depender de colunas como revoked_at/installed_at.
 */
export async function cleanupShopOnUninstall(
  shop: string
): Promise<{ deleted: boolean }> {
  const sql = `
    delete from shopify_oauth
    where lower(shop) = lower($1)
  `;
  const res = await pool.query(sql, [shop]);
  return { deleted: (res.rowCount || 0) > 0 };
}
