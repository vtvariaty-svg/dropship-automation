import { shopifyGraphQL } from "./client";

export async function publishProductToShopify(params: {
  shop: string;
  accessToken: string;
  title: string;
  descriptionHtml: string;
  images: string[];
  price: number;
}) {
  const mutation = `
    mutation CreateProduct($input: ProductInput!) {
      productCreate(input: $input) {
        product { id handle }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    input: {
      title: params.title,
      descriptionHtml: params.descriptionHtml,
      status: "ACTIVE",
      variants: [{ price: params.price.toFixed(2) }],
      images: params.images.map((src) => ({ src })),
    },
  };

  const data = await shopifyGraphQL<any>({
    shop: params.shop,
    accessToken: params.accessToken,
    query: mutation,
    variables,
  });

  const errs = data.productCreate?.userErrors ?? [];
  if (errs.length) throw new Error(`Shopify userErrors: ${JSON.stringify(errs)}`);

  return data.productCreate.product as { id: string; handle: string };
}
