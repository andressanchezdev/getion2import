// priceTier · el nivel de precio como lo escribe la app (P0..P3) y como lo escribe la API (p1..p4)
// conecta con: shop.helpers (nivel del catálogo y de la venta) y customers.adapter (nivel del cliente); funciones puras
// ojo: P0 (mostrador) es p1 en la API, P1 es p2, P2 es p3 y P3 (mayorista) es p4

export type AppPriceLevel = 'P0' | 'P1' | 'P2' | 'P3'
export type ApiPriceTier = 'p1' | 'p2' | 'p3' | 'p4'

const APP_LEVELS: AppPriceLevel[] = ['P0', 'P1', 'P2', 'P3']
const API_TIERS: ApiPriceTier[] = ['p1', 'p2', 'p3', 'p4']

// P0..P3 → p1..p4
export const toApiPriceTier = (level: AppPriceLevel): ApiPriceTier => API_TIERS[APP_LEVELS.indexOf(level)]

// p1..p4 → P0..P3; cualquier otro valor (o vacío) queda sin definir
export const fromApiPriceTier = (tier: string | null | undefined): AppPriceLevel | undefined => {
  const index = API_TIERS.indexOf(String(tier ?? '').trim().toLowerCase() as ApiPriceTier)
  return index === -1 ? undefined : APP_LEVELS[index]
}
