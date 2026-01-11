import { FastifyInstance } from 'fastify';
import {
  beginOAuth,
  handleOAuthCallback,
} from '../integrations/shopify/oauth';
import { env } from '../env';

export async function shopifyRoutes(app: FastifyInstance) {
  /**
   * Health check específico do Shopify
   */
  app.get('/shopify', async () => {
    return {
      ok: true,
      service: 'shopify',
      status: 'ready',
    };
  });

  /**
   * Início da instalação do app
   * GET /shopify/install?shop=loja.myshopify.com
   */
  app.get('/shopify/install', async (req, reply) => {
    const { shop } = req.query as { shop?: string };

    if (!shop) {
      reply.code(400);
      return { error: 'Missing shop parameter' };
    }

    const redirectUrl = beginOAuth(shop);

    reply.redirect(redirectUrl);
  });

  /**
   * Callback OAuth
   * GET /shopify/callback
   */
  app.get('/shopify/callback', async (req, reply) => {
    try {
      const result = await handleOAuthCallback(req);

      // após instalar, redireciona para app ou status
      reply.redirect(
        `${env.PUBLIC_WEB_BASE_URL}/status?shop=${result.shop}`,
      );
    } catch (err: any) {
      req.log.error(err);
      reply.code(400);
      return {
        ok: false,
        error: err.message ?? 'OAuth failed',
      };
    }
  });
}
