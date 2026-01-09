import { Queue, Worker, ConnectionOptions } from "bullmq";
import { env } from "../env";

/**
 * IMPORTANTE:
 * BullMQ espera ConnectionOptions, NÃO instância de ioredis
 */
export const connection: ConnectionOptions = {
  host: "redis",
  port: 6379,
};

export const queues = {
  ingestCatalog: new Queue("ingest.catalog", { connection }),
  scoreProduct: new Queue("score.product", { connection }),
  decideWinners: new Queue("decide.winners", { connection }),
  publishStore: new Queue("publish.store", { connection }),
  generateAds: new Queue("generate.ads", { connection }),
  publishAds: new Queue("publish.ads", { connection }),
  optimizeAds: new Queue("optimize.ads", { connection }),
  rollupMetrics: new Queue("rollup.metrics", { connection }),
  dispatchFulfillment: new Queue("dispatch.fulfillment", { connection }),
};

export const makeWorker = (
  name: string,
  handler: (job: any) => Promise<void>
) =>
  new Worker(name, handler, {
    connection,
    concurrency: 3,
  });
