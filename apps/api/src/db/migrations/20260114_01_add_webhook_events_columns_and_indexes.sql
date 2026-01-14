-- 20260114_01_add_webhook_events_columns_and_indexes.sql
-- Purpose:
--   Keep schema compatible with webhookStore inserts:
--   - api_version (text)
--   - payload_raw (text)
--   Add useful indexes for idempotency + query speed.
-- Safe to run multiple times.

alter table shopify_webhook_events
  add column if not exists api_version text;

alter table shopify_webhook_events
  add column if not exists payload_raw text;

-- Idempotency: Shopify sends unique X-Shopify-Webhook-Id
create unique index if not exists shopify_webhook_events_webhook_id_uq
  on shopify_webhook_events (webhook_id);

-- Useful for querying recent events per shop
create index if not exists shopify_webhook_events_shop_received_at_idx
  on shopify_webhook_events (shop, received_at desc);

-- Useful for filtering by topic quickly
create index if not exists shopify_webhook_events_topic_received_at_idx
  on shopify_webhook_events (topic, received_at desc);
