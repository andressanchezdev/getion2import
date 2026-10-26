// transfers.adapter · adaptadores de datos para traslados y matriz de existencias multibodega
// conecta con: transfers.service, transfers.types, transfers.api.types y el ProductDto de shop
// ojo: las líneas de un traslado vienen del backend como { productCode, productName, quantity, price } (models.SaleItemResponse); los nombres code, description y name quedan como respaldo
import type { ProductDto } from '@/features/shop'
import type { ProductStockMatrix, TrasladeItem, WarehouseStockLocation } from '../types/transfers.types'
import type { TrasladeDto } from '../types/transfers.api.types'

export const toTrasladeItems = (rawItems: TrasladeDto[]): TrasladeItem[] =>
  rawItems.map((item) => ({
    saleId: item.saleId || item.id || 0,
    serialCode: item.serialCode || item.code || 0,
    invoiceStatus: item.invoiceStatus || 'verification',
    originWarehouse: {
      id: item.warehouseInformation?.warehouseId || item.warehouseId || 0,
      name: item.warehouseInformation?.name || 'Bodega Origen',
    },
    destWarehouse: {
      id: item.auxWarehouseInformation?.warehouseId || item.auxWarehouseId || 0,
      name: item.auxWarehouseInformation?.name || 'Bodega Destino',
    },
    products: (item.products || []).map((p) => ({
      productId: p.productId || 0,
      code: p.productCode || p.code || '',
      description: p.productName || p.description || p.name || 'Repuesto',
      quantity: p.quantity || 1,
    })),
    operatorName: item.userInformation?.name ? `${item.userInformation.name} ${item.userInformation.lastName || ''}`.trim() : undefined,
    createdAt: item.created_at || item.createdAt,
    reason: item.reason,
  }))

// existencias de cada producto en las bodegas dadas; el filtro por texto ya lo hizo el backend (POST /search), por eso aquí no se filtra
export const toProductStockMatrix = (rawList: ProductDto[], warehouses: Array<{ id: string | number; name: string }>): ProductStockMatrix[] =>
  rawList.map((p) => {
    const locationsMap: WarehouseStockLocation[] = warehouses.map((w) => {
      const numId = Number(w.id)
      const loc = (p.locations || []).find((l) => Number(l.warehouseId) === numId)
      const stock = loc ? Number(loc.stock) || 0 : 0
      const reserved = loc ? Number(loc.reservedStock) || 0 : 0
      return { warehouseId: numId, warehouseName: w.name, stock, reservedStock: reserved, availableStock: Math.max(0, stock - reserved) }
    })

    return {
      productId: p.productId,
      code: p.code || '',
      description: p.description || '',
      brandName: p.brandName,
      locations: locationsMap,
      totalStock: locationsMap.reduce((acc, curr) => acc + curr.stock, 0),
      totalAvailable: locationsMap.reduce((acc, curr) => acc + curr.availableStock, 0),
    }
  })
