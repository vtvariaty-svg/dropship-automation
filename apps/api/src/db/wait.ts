import { pool } from "./pool";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function waitForPostgres(opts?: {
  attempts?: number;
  delayMs?: number;
}) {
  const attempts = opts?.attempts ?? 40; // ~40s
  const delayMs = opts?.delayMs ?? 1000;

  let lastErr: any = null;

  for (let i = 1; i <= attempts; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (e: any) {
      lastErr = e;
      // tenta de novo
      await sleep(delayMs);
    }
  }

  throw new Error(
    `Postgres not ready after ${attempts} attempts. Last error: ${lastErr?.message ?? lastErr}`
  );
}
