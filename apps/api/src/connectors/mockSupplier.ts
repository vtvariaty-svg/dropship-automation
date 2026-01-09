export function mockCatalog() {
  // catálogo simulando fornecedor: custo, estoque, shipping
  return [
    { sku: "SKU-101", title: "Garrafa Térmica Inox 1L", cost_cents: 3500, stock: 120, ship_min: 5, ship_max: 12, image: "https://picsum.photos/seed/thermos/800/800" },
    { sku: "SKU-102", title: "Luminária LED Mesa", cost_cents: 2200, stock: 90, ship_min: 6, ship_max: 14, image: "https://picsum.photos/seed/lamp/800/800" },
    { sku: "SKU-103", title: "Organizador Multiuso", cost_cents: 1500, stock: 200, ship_min: 7, ship_max: 16, image: "https://picsum.photos/seed/organizer/800/800" },
    { sku: "SKU-104", title: "Fone Bluetooth Esportivo", cost_cents: 4200, stock: 40, ship_min: 8, ship_max: 18, image: "https://picsum.photos/seed/earbuds/800/800" },
    { sku: "SKU-105", title: "Kit Cintos Elásticos", cost_cents: 1200, stock: 300, ship_min: 5, ship_max: 12, image: "https://picsum.photos/seed/belt/800/800" }
  ];
}
