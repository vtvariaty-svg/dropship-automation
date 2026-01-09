import { pool } from "../../db/pool";


export async function upsertShopifyConnection(params: {
  tenantId: number;
  shop: string;
  scope: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
}) {
  const { tenantId, shop, scope, accessToken, refreshToken, expiresAt } = params;

  await pool.query(
    `
    INSERT INTO shopify_tokens (tenant_id, shop, scope, access_token, refresh_token, expires_at)
    VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT (tenant_id, shop)
    DO UPDATE SET
      scope = EXCLUDED.scope,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()
  `,
    [tenantId, shop, scope, accessToken, refreshToken ?? null, expiresAt ?? null]
  );
}
