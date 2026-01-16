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

async function tableExists(tableName: string): Promise<boolean> {
  // to_regclass retorna NULL se a tabela nao existir.
  const res = await pool.query(`select to_regclass($1) as regclass`, [tableName]);
  return Boolean(res.rows?.[0]?.regclass);
}

/**
 * Cleanup idempotente para uninstall.
 * Regra:
 * - Nao assumir qual tabela eh a "fonte da verdade" no Neon.
 * - Tentar limpar shopify_oauth (usada por loadShopContext).
 * - Tentar limpar shopify_shop_access_tokens (usada por saveShopToken) SOMENTE se existir.
 */
export async function cleanupShopTokensOnUninstall(shop: string): Promise<void> {
  // 1) Sempre tenta remover/invalidar no shopify_oauth (pode nao existir em alguns ambientes antigos)
  //    Mantemos a linha (auditoria) e removemos o token.
  //    Se a tabela nao existir, isso levantaria erro; por isso checamos.
  if (await tableExists("public.shopify_oauth")) {
    await pool.query(
      `
        update shopify_oauth
        set access_token = null,
            scope = null,
            installed_at = installed_at
        where lower(shop) = lower($1)
      `,
      [shop]
    );
  }

  // 2) Se existir a tabela alternativa, remove a linha (idempotente).
  if (await tableExists("public.shopify_shop_access_tokens")) {
    await pool.query(`delete from shopify_shop_access_tokens where lower(shop) = lower($1)`, [shop]);
  }
}
