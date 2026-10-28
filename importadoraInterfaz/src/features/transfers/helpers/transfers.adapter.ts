// transfers.adapter · adaptadores de datos para traslados y matriz de existencias multibodega
// conecta con: transfers.service, transfers.types y toPaginated
import type {
  ProductStockMatrix,
  TrasladeItem,
  WarehouseStockLocation,
} from '../types/transfers.types'

export const toTrasladeItems = (rawItems: any[]): TrasladeItem[] =>
  rawItems.map((item: any) => ({
    saleId: item.saleId || item.id,
    serialCode: item.serialCode || item.code || 0,
    invoiceStatus: item.invoiceStatus || 'pendiente',
    originWarehouse: {
      id: item.warehouseInformation?.warehouseId || item.warehouseId || 0,
      name: item.warehouseInformation?.name || 'Bodega Origen',
    },
    destWarehouse: {
      id: item.auxWarehouseInformation?.warehouseId || item.auxWarehouseId || 0,
      name: item.auxWarehouseInformation?.name || 'Bodega Destino',
    },
    products: (item.products || []).map((p: any) => ({
      productId: p.productId || 0,
      code: p.code || '',
      description: p.description || p.name || 'Repuesto',
      quantity: p.quantity || 1,
    })),
    operatorName: item.userInformation?.name
      ? `${item.userInformation.name} ${item.userInformation.lastName || ''}`.trim()
      : undefined,
    createdAt: item.created_at || item.createdAt,
    reason: item.reason,
  }))

export const toProductStockMatrix = (
  rawList: any[],
  warehouses: Array<{ id: string | number; name: string }>,
  text?: string
): ProductStockMatrix[] =>
  rawList
    .filter((p) => {
      if (!text || text.trim() === '') return true
      const q = text.toLowerCase()
      return (
        p.code?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.brandName?.toLowerCase().includes(q)
      )
    })
    .map((p) => {
      const locationsMap: WarehouseStockLocation[] = warehouses.map((w) => {
        const numId = Number(w.id)
        const loc = (p.locations || []).find((l: any) => Number(l.warehouseId) === numId)
        const stock = loc ? Number(loc.stock) || 0 : 0
        const reserved = loc ? Number(loc.reservedStock) || 0 : 0
        return {
          warehouseId: numId,
          warehouseName: w.name,
          stock,
          reservedStock: reserved,
          availableStock: Math.max(0, stock - reserved),
        }
      })

      const totalStock = locationsMap.reduce((acc, curr) => acc + curr.stock, 0)
      const totalAvailable = locationsMap.reduce((acc, curr) => acc + curr.availableStock, 0)

      return {
        productId: p.productId,
        code: p.code || '',
        description: p.description || '',
        brandName: p.brandName,
        locations: locationsMap,
        totalStock,
        totalAvailable,
      }
    })
