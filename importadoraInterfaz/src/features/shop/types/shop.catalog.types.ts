import type React from 'react'
// shop.catalog.types · props de las partes del catálogo (filtros, estado vacío, y aviso de carga)
// conecta con: ShopCatalogFilters, ShopCatalogEmpty, y ShopCatalogStatus (las usa ShopCatalogScreen)
import type { LoadStatus } from '@/api'

export interface ShopCatalogFiltersProps {
  resultsCount: number
  totalCount: number
  children?: React.ReactNode // acción junto al resumen (por ejemplo, ver la cotización en armado)
}

export interface ShopCatalogEmptyProps {
  warehouseName: string
  hasActiveFilters: boolean
  onReset: () => void
}

export interface ShopCatalogStatusProps {
  status: LoadStatus
  error: string | null
  onRetry: () => void
}
