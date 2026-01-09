import type { FastifyInstance } from "fastify";
import { q } from "../db/pool";

export async function statusRoutes(app: FastifyInstance) {
  app.get("/status", async () => {
    const tenants = await q<any>("SELECT COUNT(*)::int AS n FROM tenants");
    const products = await q<any>("SELECT COUNT(*)::int AS n FROM products");
    const scores = await q<any>("SELECT COUNT(*)::int AS n FROM product_scores");
    const campaigns = await q<any>("SELECT COUNT(*)::int AS n FROM campaigns");
    return {
      ok: true,
      tenants: tenants[0].n,
      products: products[0].n,
      scores: scores[0].n,
      campaigns: campaigns[0].n,
    };
  });
}
