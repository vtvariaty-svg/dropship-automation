import type { FastifyBaseLogger } from "fastify";
import { Worker } from "bullmq";
import { connection } from "./queues";
import { q } from "../db/pool";

const workers: Worker[] = [];

async function ingestCatalogJob() {
  const tenants = await q<{ id: string }>("SELECT id FROM tenants LIMIT 1");
  const tenantId = tenants[0]?.id;
  if (!tenantId) throw new Error("no tenant found");

  await q(
    `
    INSERT INTO products (tenant_id, title, images, tags, status, raw)
    VALUES
      ($1, 'Produto Teste A', $2::jsonb, $3::text[], 'draft', $4::jsonb),
      ($1, 'Produto Teste B', $5::jsonb, $6::text[], 'draft', $7::jsonb),
      ($1, 'Produto Teste C', $8::jsonb, $9::text[], 'draft', $10::jsonb)
    `,
    [
      tenantId,
      JSON.stringify(["https://picsum.photos/seed/a/800/800"]),
      ["auto", "mock"],
      JSON.stringify({ source: "manual", sku: "SKU-A" }),

      JSON.stringify(["https://picsum.photos/seed/b/800/800"]),
      ["auto", "mock"],
      JSON.stringify({ source: "manual", sku: "SKU-B" }),

      JSON.stringify(["https://picsum.photos/seed/c/800/800"]),
      ["auto", "mock"],
      JSON.stringify({ source: "manual", sku: "SKU-C" }),
    ]
  );
}

async function decideWinnersJob() {
  const tenants = await q<{ id: string }>("SELECT id FROM tenants LIMIT 1");
  const tenantId = tenants[0]?.id;
  if (!tenantId) throw new Error("no tenant found");

  const products = await q<{ id: string }>("SELECT id FROM products WHERE tenant_id=$1", [tenantId]);

  for (const p of products) {
    const score = Math.floor(Math.random() * 100);
    await q(
      `
      INSERT INTO product_scores (tenant_id, product_id, score, reasons, model_version)
      VALUES ($1, $2, $3, $4::jsonb, 'debug-v1')
      ON CONFLICT (tenant_id, product_id)
      DO UPDATE SET score=EXCLUDED.score, reasons=EXCLUDED.reasons, model_version=EXCLUDED.model_version
      `,
      [tenantId, p.id, score, JSON.stringify({ mode: "debug", score })]
    );
  }
}

async function optimizeAdsJob() {
  const tenants = await q<{ id: string }>("SELECT id FROM tenants LIMIT 1");
  const tenantId = tenants[0]?.id;
  if (!tenantId) throw new Error("no tenant found");

  const products = await q<{ id: string; title: string }>(
    "SELECT id, title FROM products WHERE tenant_id=$1",
    [tenantId]
  );

  for (const p of products) {
    await q(
      `
      INSERT INTO campaigns
        (tenant_id, provider, product_id, external_id, status, daily_budget_cents, roas_target, last_metrics)
      VALUES
        ($1, 'mock', $2, $3, 'active', 2000, 2.0, '{}'::jsonb)
      `,
      [tenantId, p.id, `mock_campaign_${p.title.replace(/\s+/g, "_")}_${Date.now()}`]
    );
  }
}

export async function startWorkers(log: FastifyBaseLogger) {
  log.info("starting workers...");

  workers.push(
    new Worker(
      "ingest.catalog",
      async () => {
        log.info("worker ingest.catalog running");
        await ingestCatalogJob();
      },
      { connection }
    )
  );

  workers.push(
    new Worker(
      "decide.winners",
      async () => {
        log.info("worker decide.winners running");
        await decideWinnersJob();
      },
      { connection }
    )
  );

  workers.push(
    new Worker(
      "optimize.ads",
      async () => {
        log.info("worker optimize.ads running");
        await optimizeAdsJob();
      },
      { connection }
    )
  );

  log.info({ count: workers.length }, "workers started");
}
