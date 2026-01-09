import { q } from "./pool";

export async function ensureTenantSeed(name: string) {
  const existing = await q<any>("SELECT id FROM tenants LIMIT 1");
  if (existing.length) return existing[0].id as string;

  const [t] = await q<any>("INSERT INTO tenants (name) VALUES ($1) RETURNING id", [name]);
  return t.id as string;
}
