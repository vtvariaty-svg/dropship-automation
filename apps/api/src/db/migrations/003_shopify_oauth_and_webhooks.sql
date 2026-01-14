-- 003_shopify_oauth_and_webhooks.sql

-- Tabela de OAuth usada pelo código atual.
create table if not exists shopify_oauth (
  shop text primary key,
  access_token text not null,
  scope text,
  installed_at timestamptz not null default now()
);

-- Eventos de webhooks (audit / debug)
create table if not exists shopify_webhook_events (
  id bigserial primary key,
  webhook_id text not null,
  shop text not null,
  topic text not null,
  payload jsonb not null,
  headers jsonb not null,
  received_at timestamptz not null default now(),
  status text not null default 'received',
  api_version text,
  payload_raw text
);

create unique index if not exists shopify_webhook_events_webhook_id_uidx
  on shopify_webhook_events (webhook_id);

create index if not exists shopify_webhook_events_shop_received_at_idx
  on shopify_webhook_events (shop, received_at desc);

create index if not exists shopify_webhook_events_topic_received_at_idx
  on shopify_webhook_events (topic, received_at desc);
