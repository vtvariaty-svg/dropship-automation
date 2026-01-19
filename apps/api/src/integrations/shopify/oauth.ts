import crypto from 'crypto';

export function normalizeShop(shop: string): string {
  return shop.replace('.myshopify.com', '').trim() + '.myshopify.com';
}

export function randomState(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function verifyHmac(
  query: Record<string, string>,
  secret: string
): boolean {
  const { hmac, ...rest } = query;

  const message = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join('&');

  const digest = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  return digest === hmac;
}

export function verifyWebhookHmac(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(signature)
  );
}
