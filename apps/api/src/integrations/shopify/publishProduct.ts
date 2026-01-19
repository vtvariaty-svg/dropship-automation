// apps/api/src/integrations/shopify/publishProduct.ts
import type { PublishProductInput, PublishProductResult } from "../../platforms/types";
import { shopifyGraphQL } from "./client";

export async function publishProductShopify(input: PublishProductInput): Promise<PublishProductResult> {
  const mutation = `
    mutation ProductCreate($input: ProductInput!) {
      productCreate(input: $input) {
        product { id handle }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    input: {
      title: input.title,
      descriptionHtml: input.descriptionHtml || "",
    },
  };

  const data = await shopifyGraphQL<{
    productCreate: {
      product: { id: string; handle: string } | null;
      userErrors: Array<{ field?: string[]; message: string }>;
    };
  }>(input.shop, input.accessToken, mutation, variables);

  const errs = data.productCreate.userErrors || [];
  if (errs.length) {
    return { ok: false, externalId: "", cleaned: false };
  }

  const p = data.productCreate.product;
  if (!p?.id) return { ok: false, externalId: "", cleaned: false };

  return { ok: true, externalId: p.id, handle: p.handle, cleaned: true };
}
