import type { FastifyInstance } from "fastify";

export async function rootRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return {
      ok: true,
      app: "CliqueBuy Automation",
      status: "running",
      message: "Shopify app installed and backend is responding",
      timestamp: new Date().toISOString(),
    };
  });
}
