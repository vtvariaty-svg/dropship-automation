import type { FastifyInstance } from "fastify";

export async function rootRoutes(app: FastifyInstance) {
  app.get("/", async (req, reply) => {
    const q = req.query as any;
    const shop = String(q.shop ?? "");
    const embedded = String(q.embedded ?? "");
    const host = String(q.host ?? "");

    // Se estiver abrindo pelo Admin (iframe), devolve HTML simples por enquanto
    // (depois você pode trocar por um frontend embedado com App Bridge).
    if (embedded === "1" || embedded === "true" || host) {
      reply.type("text/html; charset=utf-8");
      return reply.send(`
<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CliqueBuy Automation</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; padding: 24px; }
      code { background: #f4f4f5; padding: 2px 6px; border-radius: 6px; }
      .box { max-width: 860px; margin: 0 auto; }
      .muted { opacity: .75; }
      .row { margin: 12px 0; }
      a { color: #0b5fff; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>CliqueBuy Automation ✅</h1>
      <p class="muted">Backend está respondendo dentro do Admin do Shopify.</p>

      <div class="row"><b>shop</b>: <code>${shop || "(não informado)"}</code></div>
      <div class="row"><b>host</b>: <code>${host || "(não informado)"}</code></div>

      <hr/>

      <h3>Próximos testes (API)</h3>
      <ul>
        <li><a href="/health" target="_blank">/health</a></li>
        <li><a href="/status" target="_blank">/status</a></li>
        ${shop ? `<li><a href="/shopify/products?shop=${encodeURIComponent(shop)}" target="_blank">/shopify/products?shop=${shop}</a></li>` : ""}
      </ul>

      <p class="muted">
        Observação: essa página é provisória. Depois entraremos com o App embedado (UI) e chamadas via session token.
      </p>
    </div>
  </body>
</html>
      `.trim());
    }

    // Fora do Admin, pode ser JSON simples
    return {
      ok: true,
      app: "CliqueBuy Automation",
      status: "running",
      message: "Shopify app installed and backend is responding",
      timestamp: new Date().toISOString(),
    };
  });
}
