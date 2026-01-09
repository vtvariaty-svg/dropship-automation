import type { FastifyInstance } from "fastify";
import { q } from "../db/pool";

export async function metricsRoutes(app: FastifyInstance) {
  app.get("/metrics/today", async () => {
    const rows = await q<any>(
      `SELECT tenant_id, day, revenue_cents, ad_spend_cents, roas, profit_cents
       FROM metrics_daily
       WHERE day=CURRENT_DATE
       ORDER BY profit_cents DESC`
    );
    return { ok: true, rows };
  });
}
