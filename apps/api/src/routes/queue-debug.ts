import type { FastifyInstance } from "fastify";
import { queues } from "../jobs/queues";

async function summarize(queue: any) {
  const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
  const failed = await queue.getFailed(0, 20);
  const active = await queue.getActive(0, 20);
  const waiting = await queue.getWaiting(0, 20);

  return {
    name: queue.name,
    counts,
    sample: {
      failed: await Promise.all(
        failed.map(async (j: any) => ({
          id: j.id,
          name: j.name,
          attemptsMade: j.attemptsMade,
          failedReason: j.failedReason,
          stacktrace: (j.stacktrace ?? []).slice(0, 2),
          data: j.data,
          timestamp: j.timestamp,
        }))
      ),
      active: active.map((j: any) => ({ id: j.id, name: j.name, data: j.data })),
      waiting: waiting.map((j: any) => ({ id: j.id, name: j.name, data: j.data })),
    },
  };
}

export async function queueDebugRoutes(app: FastifyInstance) {
  app.get("/debug/queues", async () => {
    const res = await Promise.all([
      summarize(queues.ingestCatalog),
      summarize(queues.decideWinners),
      summarize(queues.optimizeAds),
    ]);
    return { ok: true, queues: res };
  });
}
