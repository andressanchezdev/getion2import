// formRegistry.test — todas las acciones que se abren en el panel derecho tienen su formulario, su título y su ícono
// conecta con: formRegistry; se corre con npm test
import { describe, expect, it } from 'vitest'
import type { DrawerFormKind } from '@/features/navigation'
import { getFormEntry } from './formRegistry'

// payload de ejemplo de cada acción (lo mínimo que usa su título)
const SAMPLES: Record<DrawerFormKind, unknown> = {
  createCustomer: undefined,
  editCustomer: 7,
  createTransfer: undefined,
  receiveTransfer: { id: 1, serialCode: 'TR-1', products: [] },
  auditDetail: { id: 9 },
  employeeDetail: { employeeId: 1, name: 'Ana', email: 'ana@x.co', identification: '1' },
  employeePermissions: { employee: { employeeId: 1, name: 'Ana' }, mode: 'view' },
  quotationDetail: 12,
  roleForm: null,
  companyWarehouses: { id: 3, name: 'Importadora' },
  checkout: { mode: 'sale' },
  productDetail: { id: '1', name: 'Producto Prueba', code: 'P001', prices: { p0: 100, p1: 90, p2: 80, p3: 70 }, stockByWarehouse: {} },
  editProduct: { id: '1', name: 'Producto Prueba', code: 'P001', prices: { p0: 100, p1: 90, p2: 80, p3: 70 }, stockByWarehouse: {} },
  productLocations: { id: '1', name: 'Producto Prueba', code: 'P001', prices: { p0: 100, p1: 90, p2: 80, p3: 70 }, stockByWarehouse: {} },
  relocateStock: { stockId: 1, productCode: 'P001', productName: 'Producto Prueba', availableQuantity: 10 },
  catalogItem: { type: 'brand', noun: 'marcas', item: { id: 1, name: 'Yamaha' } },
  catalogDetail: { type: 'brand', noun: 'marcas', item: { id: 1, name: 'Yamaha' } },
  enableCredit: undefined,
  bankConfirm: { id: 1, description: 'PAGO QR', amount: 1000 },
  createProduct: undefined,
  qrLabels: { heading: 'Etiquetas', labels: [] },
  locationForm: { warehouseId: 1, warehouseName: 'Principal' },
  locationDetail: { location: { id: 1, warehouseId: 1, code: 'ESTANTE-A', description: '', isActive: true, productCount: 0, units: 0 }, warehouseName: 'Principal', onChanged: () => {} },
  externalForm: { kind: 'supplier' },
  warehouseForm: {},
  warehouseDetail: { warehouse: { id: '1', name: 'Bodega Principal' } },
  assignStock: {},
  createAbono: {},
  cashOpen: undefined,
  cashClose: undefined,
  purchaseDetail: { id: 1 },
  purchaseReceive: { id: 1 },
  purchasePay: { id: 1 },
  supplierCatalog: { id: 1, name: 'Proveedor' },
  purchaseForm: undefined,
  billingConfig: undefined,
  docSeriesForm: { id: 1, warehouseId: 1, docType: 'invoice', prefix: 'FE-', nextNumber: 2 },
  cashCollect: { order: { id: 1, serial: 'PD-1', stage: 'verification', channel: 'standard', customerName: 'Taller', sellerName: 'Ana', paymentMethod: 'cash', totalAmount: 100000, createdAt: '2026-11-01', paused: false, paymentVerified: false, locationVerified: false, paidAmount: 0, creditAmount: 0, confirmed: false } },
  abonoDetail: { id: 1, serialCode: 'REC-1', customerName: 'Taller', customerDoc: '123', method: 'cash', amount: 1000, status: 'verified', date: '2026-10-31' },
  transferDetail: {
    transfer: {
      id: 1,
      serialCode: 'TR-1',
      sourceWarehouseId: 1,
      sourceWarehouseName: 'Central',
      targetWarehouseId: 2,
      targetWarehouseName: 'Norte',
      status: 'pending',
      requestedAt: '2026-03-30',
      totalItems: 5,
      driverName: 'Carlos',
      vehiclePlate: 'ABC-123',
    },
  },
  adminForm: undefined,
  registerExpense: undefined,
  reasonForm: { requestId: 'reason-1', title: 'Desactivar', message: 'Motivo requerido' },
  verifyGoods: { orderId: 1, serial: 'PD-1', customerName: 'Cliente', total: 0, onVerified: () => undefined },
  countDetail: { count: { id: 1 } },
  permissionsHub: 'viewRoles',
}

describe('formRegistry', () => {
  const kinds = Object.keys(SAMPLES) as DrawerFormKind[]

  it('tiene configuradas todas las acciones del tipo DrawerFormKind', () => {
    expect(kinds.length).toBeGreaterThan(0)
    for (const kind of kinds) {
      const entry = getFormEntry({ kind })
      expect(entry, `Falta la entrada de "${kind}" en formRegistry`).toBeDefined()
    }
  })

  it('cada entrada tiene icono, título y componente que se puede pintar', () => {
    for (const kind of kinds) {
      const entry = getFormEntry({ kind })!
      expect(entry.icon, `"${kind}" debe tener icono`).toBeTruthy()

      const title = entry.title(SAMPLES[kind])
      expect(typeof title === 'string' && title.length > 0, `El título de "${kind}" debe ser un texto`).toBe(true)

      const element = entry.render(SAMPLES[kind])
      expect(element, `El render de "${kind}" debe devolver un elemento`).toBeTruthy()
    }
  })
})
