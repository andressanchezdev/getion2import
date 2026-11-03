// transfers.adapter · convierte lo que responde la API a lo que usa la app
import type { TransferDto, TransferProductDto, TransferStockRowDto } from '../types/transfers.api.types'
import type { ProductStockMatrix, TransferStatus, TrasladeItem, WarehouseStockLocation } from '../types/transfers.types'

const STATUSES: TransferStatus[] = ['pending', 'in_transit', 'received', 'with_novelty', 'cancelled']

export const toTransferStatus = (status: string): TransferStatus =>
  STATUSES.includes(status as TransferStatus) ? (status as TransferStatus) : 'pending'

// texto en español del tipo de traslado
export const getTransferTypeLabel = (type?: string): string => {
  switch (type) {
    case 'relocation':
      return 'Reubicación Interna'
    case 'central_dispatch':
      return 'Despacho Central'
    case 'inter_warehouse':
    case 'standard':
    default:
      return 'Solicitud entre Bodegas'
  }
}

// convierte un traslado de la API en el que usa la app
export const toTrasladeItem = (dto: TransferDto): TrasladeItem => {
  const status = toTransferStatus(dto.status)
  const isNovelty = status === 'with_novelty' || Boolean(dto.noveltyNotes)
  return {
    id: dto.id,
    serialCode: dto.serialCode || String(dto.id),
    type: dto.transferType || 'standard',
    typeLabel: getTransferTypeLabel(dto.transferType),
    status: isNovelty ? 'with_novelty' : status,
    priority: isNovelty || dto.priority === 'high' ? 'high' : 'normal',
    originWarehouse: { id: dto.originWarehouseId, name: dto.originWarehouseName || 'Bodega Origen' },
    destWarehouse: { id: dto.destinationWarehouseId, name: dto.destinationWarehouseName || 'Bodega Destino' },
    products: (dto.items ?? []).map((item) => ({
      itemId: item.id,
      productId: item.productId,
      code: item.productCode,
      description: item.productName || item.productCode || 'Repuesto',
      quantity: item.quantity,
      destinationLocation: item.destinationLocation ?? '',
    })),
    employeeId: dto.employeeId,
    employeeName: dto.employeeName || (dto.employeeId ? `Empleado #${dto.employeeId}` : undefined),
    dispatchedByEmployeeId: dto.dispatchedByEmployeeId,
    dispatchedByEmployeeName: dto.dispatchedByEmployeeName || (dto.dispatchedByEmployeeId ? `Empleado #${dto.dispatchedByEmployeeId}` : undefined),
    receivedByEmployeeId: dto.receivedByEmployeeId,
    receivedByEmployeeName: dto.receivedByEmployeeName || (dto.receivedByEmployeeId ? `Empleado #${dto.receivedByEmployeeId}` : undefined),
    createdAt: dto.createdAt,
    dispatchedAt: dto.dispatchedAt,
    receivedAt: dto.receivedAt,
    notes: dto.notes || undefined,
    noveltyNotes: dto.noveltyNotes || undefined,
  }
}

export const toProductStockMatrix = (
  product: TransferProductDto,
  rows: TransferStockRowDto[],
  warehouses: Array<{ id: string | number; name: string }>
): ProductStockMatrix => {
  const locations: WarehouseStockLocation[] = warehouses.map((warehouse) => {
    const own = rows.filter((row) => row.warehouseId === Number(warehouse.id))
    const available = own.reduce((sum, row) => sum + row.available, 0)
    const reserved = own.reduce((sum, row) => sum + row.reserved, 0)
    return {
      warehouseId: Number(warehouse.id),
      warehouseName: warehouse.name,
      stock: available,
      reservedStock: reserved,
      availableStock: own.reduce((sum, row) => sum + row.sellable, 0),
    }
  })
  return {
    productId: product.id,
    code: product.code ?? '',
    description: product.description || product.name || '',
    brandName: product.brandName ?? undefined,
    locations,
    totalStock: locations.reduce((sum, loc) => sum + loc.stock, 0),
    totalAvailable: locations.reduce((sum, loc) => sum + loc.availableStock, 0),
  }
}
