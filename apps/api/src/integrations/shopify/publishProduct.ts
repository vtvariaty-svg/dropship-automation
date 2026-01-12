import { shopifyGraphQL } from "./client";

export async function publishProduct(args: {
  shop: string;
  accessToken: string;
  productId: string; // "gid://shopify/Product/123..."
}): Promise<any> {
  const { shop, accessToken, productId } = args;

  // Exemplo simples: publica em um sales channel padrão (Online Store)
  // (Você pode evoluir depois pra escolher publicationId dinamicamente.)
  const query = `
    mutation PublishProduct($id: ID!) {
      publishablePublish(id: $id, input: { publicationId: "gid://shopify/Publication/1" }) {
        publishable {
          __typename
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  return shopifyGraphQL({
    shop,
    accessToken,
    query,
    variables: { id: productId },
  });
}
