import fs from "node:fs";
import path from "node:path";
import { pool } from "./pool";

export async function runMigrations() {
  const dir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  for (const file of files) {
    const already = await pool.query("SELECT filename FROM schema_migrations WHERE filename=$1", [file]);
    if (already.rowCount) continue;

    const sql = fs.readFileSync(path.join(dir, file), "utf8");

    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO schema_migrations(filename) VALUES($1)", [file]);
      await pool.query("COMMIT");
      console.log(`[migrate] applied ${file}`);
    } catch (e) {
      await pool.query("ROLLBACK");
      throw e;
    }
  }
}
