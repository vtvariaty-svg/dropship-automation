CREATE TABLE IF NOT EXISTS shopify_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  webhook_id TEXT NOT NULL UNIQUE,
  shop TEXT NOT NULL,
  topic TEXT NOT NULL,
  api_version TEXT NULL,
  payload_json JSONB NOT NULL,
  payload_raw TEXT NOT NULL,
  headers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'received',
  error TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_shopify_webhook_events_shop ON shopify_webhook_events(shop);
CREATE INDEX IF NOT EXISTS idx_shopify_webhook_events_topic ON shopify_webhook_events(topic);
CREATE INDEX IF NOT EXISTS idx_shopify_webhook_events_status ON shopify_webhook_events(status);
