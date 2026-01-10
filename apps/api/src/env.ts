import { z } from "zod";

/**
 * Schema de variáveis de ambiente
 * - Centraliza validação
 * - Evita crash silencioso em produção
 * - Compatível com Render, Docker e local
 */
const envSchema = z.object({
  /* =========================
     Core
  ========================= */
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().default(3000),

  BASE_URL: z.string().url(),

  /* =========================
     Shopify
  ========================= */
  SHOPIFY_API_KEY: z.string(),
  SHOPIFY_API_SECRET: z.string(),

  // Scopes separados por vírgula
  SHOPIFY_SCOPES: z.string(),

  // ✅ CORREÇÃO DO ERRO
  // Usado no shopify.ts
  SHOPIFY_API_VERSION: z.string().default("2024-10"),

  /* =========================
     Redis (opcional, mas preparado)
  ========================= */
  REDIS_URL: z.string().optional(),

  /* =========================
     Observabilidade / Debug
  ========================= */
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),
});

/**
 * Parse seguro do process.env
 * Se faltar algo obrigatório → crash controlado no boot
 */
export const env = envSchema.parse(process.env);

/**
 * Tipo inferido automaticamente
 * Garante autocomplete e segurança no código
 */
export type Env = z.infer<typeof envSchema>;
