import crypto from 'crypto';
import { FastifyRequest } from 'fastify';
import { env } from '../../env';
import { upsertShopConnection } from './store';

/**
 * Gera URL de instalação do app Shopify
 */
export function beginOAuth(shop: string): string {
  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: env.SHOPIFY_CLIENT_ID,
    scope: env.SHOPIFY_SCOPES,
    redirect_uri: env.SHOPIFY_REDIRECT_URI,
    state,
    response_type: 'code',
  });

  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Processa callback OAuth do Shopify
 */
export async function handleOAuthCallback(req: FastifyRequest) {
  const query = req.query as Record<string, string>;

  const { shop, hmac, code, state } = query;

  if (!shop || !hmac || !code || !state) {
    throw new Error('Missing required OAuth parameters');
  }

  validateHmac(query);

  // troca code por access token
  const tokenResponse = await fetch(
    `https://${shop}/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: env.SHOPIFY_CLIENT_ID,
        client_secret: env.SHOPIFY_CLIENT_SECRET,
        code,
      }),
    },
  );

  if (!tokenResponse.ok) {
    throw new Error('Failed to exchange code for token');
  }

  const data = await tokenResponse.json();

  const accessToken = data.access_token as string;

  if (!accessToken) {
    throw new Error('Invalid access token response');
  }

  // salva ou atualiza loja no banco
  await upsertShopConnection({
    shop,
    accessToken,
    scopes: env.SHOPIFY_SCOPES,
  });

  return { shop };
}

/**
 * Validação HMAC oficial Shopify
 */
function validateHmac(query: Record<string, string>) {
  const { hmac, ...rest } = query;

  const message = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join('&');

  const digest = crypto
    .createHmac('sha256', env.SHOPIFY_CLIENT_SECRET)
    .update(message)
    .digest('hex');

  if (digest !== hmac) {
    throw new Error('Invalid HMAC validation');
  }
}
