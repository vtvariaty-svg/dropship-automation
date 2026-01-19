// apps/api/src/platforms/adapter.ts
import type {
  EnsureWebhooksArgs,
  EnsureWebhooksResult,
  ExchangeTokenInput,
  ExchangeTokenResult,
  OAuthInstallUrlInput,
  PublishProductInput,
  PublishProductResult,
  VerifyHmacInput,
  VerifyWebhookInput,
} from "./types";

export interface PlatformAdapter {
  key: string;

  normalizeTenant(input: string): string;

  buildInstallUrl(input: OAuthInstallUrlInput): string;

  verifyHmac(input: VerifyHmacInput): boolean;

  exchangeCodeForToken(input: ExchangeTokenInput): Promise<ExchangeTokenResult>;

  verifyWebhookHmac(input: VerifyWebhookInput): boolean;

  ensureWebhooks(args: EnsureWebhooksArgs): Promise<EnsureWebhooksResult>;

  publishProduct(input: PublishProductInput): Promise<PublishProductResult>;
}
