import crypto from "node:crypto";
import { env } from "../../env";

export function verifyShopifyWebhookHmac(params: {
  rawBody: string;
  hmacHeader: string | undefined;
}): boolean {
  const { rawBody, hmacHeader } = params;

  if (!hmacHeader) return false;

  const digest = crypto
    .createHmac("sha256", env.SHOPIFY_CLIENT_SECRET)
    .update(rawBody, "utf8")
    .digest("base64");

  // timing-safe compare
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}
