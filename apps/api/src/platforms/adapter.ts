// apps/api/src/platforms/adapter.ts
import type {
  AccessTokenRecord,
  EnsureWebhooksInput,
  OAuthFinalizeInput,
  Platform,
  PublishProductInput,
  PublishProductResult,
} from "./types";

/**
 * Contrato estável para qualquer plataforma.
 * Shopify é só a primeira implementação.
 *
 * Regras:
 * - "externalId" = identificador da loja na plataforma
 *   (Shopify: shop domain; Woo: store id/url; etc.)
 * - O core chama o adapter; o adapter encapsula detalhes (GraphQL/REST/HMAC/etc.)
 */
export interface PlatformAdapter {
  readonly platform: Platform;

  /** Normaliza o externalId para forma canônica (Shopify: lowercase, sem https). */
  normalizeExternalId(input: string): string;

  /**
   * Valida HMAC do webhook (se a plataforma suportar assinatura).
   * Retorna true/false; nunca lança por mismatch.
   */
  verifyWebhookSignature(args: { rawBody: string; signatureHeader: string; secret: string }): boolean;

  /**
   * Finaliza instalação: persistir token + registrar webhooks essenciais.
   * Deve ser idempotente do ponto de vista de persistência (upsert).
   */
  finalizeOAuthInstall(input: OAuthFinalizeInput): Promise<void>;

  /**
   * Limpeza ao receber uninstall/desautorização.
   * Deve ser idempotente (reentregas não podem falhar).
   */
  cleanupOnUninstall(args: { externalId: string }): Promise<{ cleaned: boolean }>;

  /**
   * Garante webhooks essenciais (se aplicável).
   * Não precisa ser chamado sempre; pode ser acionado por job.
   */
  ensureCoreWebhooks(input: EnsureWebhooksInput): Promise<void>;

  /**
   * Exemplo de ação “core” que depois vira automação:
   * publicar produto.
   */
  publishProduct(input: PublishProductInput): Promise<PublishProductResult>;

  /**
   * Opcional: leitura de token (útil para rotas/health).
   * Retorna null se não existir.
   */
  getAccessToken?(args: { externalId: string }): Promise<AccessTokenRecord | null>;
}
