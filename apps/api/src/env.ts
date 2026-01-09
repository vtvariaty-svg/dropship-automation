type Env = {
  NODE_ENV: string;
  PORT: number;

  BASE_URL: string;

  DATABASE_URL: string;
  REDIS_URL: string;

  // Shopify OAuth
  SHOPIFY_CLIENT_ID: string;
  SHOPIFY_CLIENT_SECRET: string;
  SHOPIFY_SCOPES: string;
};

function must(name: keyof Env, fallback?: any) {
  const v = process.env[name as string] ?? fallback;
  if (v === undefined || v === null || v === "") {
    throw new Error(`Missing env var: ${String(name)}`);
  }
  return v as any;
}

export const env: Env = {
  NODE_ENV: String(process.env.NODE_ENV ?? "development"),
  PORT: Number(process.env.PORT ?? 3000),

  BASE_URL: String(must("BASE_URL", "http://localhost:3000")),

  DATABASE_URL: String(must("DATABASE_URL")),
  REDIS_URL: String(must("REDIS_URL")),

  SHOPIFY_CLIENT_ID: String(must("SHOPIFY_CLIENT_ID")),
  SHOPIFY_CLIENT_SECRET: String(must("SHOPIFY_CLIENT_SECRET")),
  SHOPIFY_SCOPES: String(must("SHOPIFY_SCOPES", "read_products,write_products,read_orders,write_orders")),
};
