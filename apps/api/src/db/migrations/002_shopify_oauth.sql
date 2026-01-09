CREATE TABLE IF NOT EXISTS shopify_connections (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     BIGINT NOT NULL,
  shop          TEXT NOT NULL,
  scope         TEXT NOT NULL,
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ,
  installed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, shop)
);

CREATE INDEX IF NOT EXISTS idx_shopify_connections_tenant
  ON shopify_connections (tenant_id);

CREATE INDEX IF NOT EXISTS idx_shopify_connections_shop
  ON shopify_connections (shop);
