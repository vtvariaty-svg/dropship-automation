export async function mockPublishCampaign(input: { productTitle: string }) {
  return { externalId: `mock_campaign_${input.productTitle.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}` };
}

export function mockMetrics() {
  // simula métricas variáveis (para o otimizador agir)
  const spend = Math.floor(500 + Math.random() * 2500);
  const revenue = Math.random() > 0.45 ? Math.floor(spend * (1.2 + Math.random() * 2.5)) : 0;
  const roas = spend > 0 ? revenue / spend : 0;
  const ctr = Number((0.3 + Math.random() * 2.2).toFixed(2));
  const cpc = Number((0.4 + Math.random() * 2.5).toFixed(2));
  return { spend, revenue, roas: Number(roas.toFixed(2)), ctr, cpc };
}
