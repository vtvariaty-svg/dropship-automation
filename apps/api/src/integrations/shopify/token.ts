import axios from "axios";
import { env } from "../../env";

export async function exchangeCodeForToken(params: { shop: string; code: string }) {
  const { shop, code } = params;

  const resp = await axios.post(`https://${shop}/admin/oauth/access_token`, {
    client_id: env.SHOPIFY_CLIENT_ID,
    client_secret: env.SHOPIFY_CLIENT_SECRET,
    code,
  });

  return resp.data as {
    access_token: string;
    scope?: string;
    expires_in?: number;
    refresh_token?: string;
  };
}
