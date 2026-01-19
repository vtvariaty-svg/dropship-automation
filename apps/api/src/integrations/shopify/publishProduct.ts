import { shopifyGraphQL } from "./client";

export type ShopifyPublishProductParams = {
  shop: string;
  accessToken: string;
  title: string;
  descriptionHtml: string;
  images: string[];
  price: number;
};

export type ShopifyPublishProductResult = {
  externalId: string; // product id na plataforma
  handle: string;
};

/**
 * MVP de publicação: cria Product via GraphQL e devolve id/handle.
 * (Preço/imagens podem evoluir depois; por enquanto mantém o build estável.)
 */
export async function publishProductToShopify(
  params: ShopifyPublishProductParams
): Promise<ShopifyPublishProductResult> {
  const mutation = `
    mutation ProductCreate($input: ProductInput!) {
      productCreate(input: $input) {
        product {
          id
          handle
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      title: params.title,
      descriptionHtml: params.descriptionHtml,
    },
  };

  const response = await shopifyGraphQL<{
    data?: {
      productCreate?: {
        product?: { id: string; handle: string };
        userErrors?: Array<{ field?: string[]; message: string }>;
      };
    };
    errors?: unknown;
  }>(params.shop, params.accessToken, mutation, variables);

  const userErrors = response?.data?.productCreate?.userErrors ?? [];
  if (userErrors.length) {
    throw new Error(
      `Shopify productCreate userErrors: ${JSON.stringify(userErrors)}`
    );
  }

  const product = response?.data?.productCreate?.product;
  if (!product?.id || !product?.handle) {
    throw new Error(`Shopify productCreate returned no product`);
  }

  return { externalId: product.id, handle: product.handle };
}

/**
 * Alias para compat com chamadas antigas (se existir import `publishProduct`).
 */
export const publishProduct = publishProductToShopify;
