function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 3000),

  BASE_URL: required("BASE_URL"),

  DATABASE_URL: required("DATABASE_URL"),

  SHOPIFY_API_KEY: required("SHOPIFY_API_KEY"),
  SHOPIFY_API_SECRET: required("SHOPIFY_API_SECRET"),
  SHOPIFY_SCOPES: required("SHOPIFY_SCOPES"),
  SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION ?? "2024-01",
};
