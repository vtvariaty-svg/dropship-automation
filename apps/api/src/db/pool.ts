import pg from "pg";
import { env } from "../env";

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing (check docker-compose.yml env).");
}

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  // Em produção (Neon/Render), você pode precisar de SSL.
  // Local (docker) normalmente não precisa.
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export async function q<T = any>(text: string, params: any[] = []) {
  const res = await pool.query(text, params);
  return res.rows as T[];
}
