import type { FastifyInstance } from "fastify";
import { queues } from "../jobs/queues";

export async function runRoutes(app: FastifyInstance) {
  async function enqueueIngest() {
    await queues.ingestCatalog.add("manual", {});
    return { ok: true, queued: "ingest.catalog" };
  }

  async function enqueueAll() {
    await queues.ingestCatalog.add("manual", {});
    await queues.decideWinners.add("manual", {});
    await queues.optimizeAds.add("manual", {});
    return { ok: true, queued: ["ingest.catalog", "decide.winners", "optimize.ads"] };
  }

  // ✅ GET (para abrir no navegador)
  app.get("/run/ingest", async () => enqueueIngest());
  app.get("/run/all", async () => enqueueAll());

  // ✅ POST (para automação / integração futura)
  app.post("/run/ingest", async () => enqueueIngest());
  app.post("/run/all", async () => enqueueAll());
}
