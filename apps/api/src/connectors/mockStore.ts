export async function mockPublishProduct(input: { title: string }) {
  // simula “Shopify product gid”
  return { externalId: `mock_store_${input.title.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}` };
}
