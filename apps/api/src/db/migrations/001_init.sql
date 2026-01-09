CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- cj|aliexpress|spocket|mock
  access_token TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider)
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description_html TEXT,
  category TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  status TEXT NOT NULL DEFAULT 'draft', -- draft|published|paused
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_account_id UUID NOT NULL REFERENCES supplier_accounts(id) ON DELETE CASCADE,
  supplier_sku TEXT NOT NULL,
  cost_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  stock INT,
  shipping_days_min INT,
  shipping_days_max INT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  UNIQUE (tenant_id, supplier_account_id, supplier_sku)
);

CREATE TABLE IF NOT EXISTS product_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_variant_id UUID NOT NULL REFERENCES supplier_variants(id) ON DELETE CASCADE,
  price_cents INT NOT NULL,
  margin_pct NUMERIC(6,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (tenant_id, product_id, supplier_variant_id)
);

CREATE TABLE IF NOT EXISTS product_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  score NUMERIC(6,2) NOT NULL,
  reasons JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_version TEXT NOT NULL DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, product_id)
);

CREATE TABLE IF NOT EXISTS store_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL, -- shopify gid (ou mock)
  status TEXT NOT NULL DEFAULT 'active',
  published_at TIMESTAMPTZ,
  UNIQUE (tenant_id, product_id)
);

CREATE TABLE IF NOT EXISTS ad_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- meta|google|mock
  headline TEXT,
  primary_text TEXT,
  description TEXT,
  image_prompt TEXT,
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- meta|google|mock
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  external_id TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active|paused
  daily_budget_cents INT NOT NULL DEFAULT 2000,
  roas_target NUMERIC(8,2) NOT NULL DEFAULT 2.0,
  last_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_order_id TEXT NOT NULL,
  customer_email TEXT,
  total_cents INT NOT NULL,
  currency TEXT NOT NULL,
  financial_status TEXT,
  fulfillment_status TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, store_order_id)
);

CREATE TABLE IF NOT EXISTS payment_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- stripe
  external_id TEXT NOT NULL,
  order_ref TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  amount_cents INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider, external_id)
);

CREATE TABLE IF NOT EXISTS fulfillments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  supplier_provider TEXT NOT NULL,
  supplier_order_id TEXT,
  tracking_code TEXT,
  tracking_url TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  last_update_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS metrics_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  revenue_cents INT NOT NULL DEFAULT 0,
  cost_cents INT NOT NULL DEFAULT 0,
  ad_spend_cents INT NOT NULL DEFAULT 0,
  orders_count INT NOT NULL DEFAULT 0,
  roas NUMERIC(10,4) NOT NULL DEFAULT 0,
  profit_cents INT NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, day)
);
