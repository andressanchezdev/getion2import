// employees.permissions.constants · a qué módulo de permisos de la API corresponde cada pantalla del menú, qué acciones enciende cada columna de la matriz y las acciones especiales
// conecta con: employees.adapter (convierte en los dos sentidos), SpecialActionsSelector (casillas de acciones especiales) y employees.permissions.test (revisa el mapa contra MENU_ITEMS)
// ojo: los nombres de módulo y acción son los mismos de importadoraApi/src/core/types/permission_types.go (catálogo único de la API); si se agrega uno allá, se agrega aquí
// ojo: una pantalla asignable sin módulo no se podría configurar; employees.permissions.test falla si eso pasa
import type { ERPModule } from '@/features/navigation'

// «módulo.subgestión» del menú → módulo de permisos de la API
export const SCREEN_API_MODULE: Record<string, string> = {
  'shop.catalog': 'catalog',
  'shop.quotationCatalog': 'quotations',
  'shop.quotations': 'quotations',
  'shop.orders': 'orders',
  'shop.transfers': 'transfers',
  'shop.receiving': 'purchases', // recepción de compra
  'shop.cashRegister': 'cash',
  'shop.generalReport': 'reports',
  'cashRegister.billingHistory': 'orders',
  'cashRegister.invoices': 'invoices', // Facturas = lo que pagan las cajas: tiene su propio permiso
  'cashRegister.purchaseOrders': 'purchases',
  'cashRegister.returns': 'returns',
  'inventory.warehouses': 'warehouses', // bodegas; editar sus ubicaciones pide además stock:edit
  'inventory.products': 'products',
  'inventory.counts': 'stock', // conteos físicos (las acciones de conteo son especiales: stock:count y stock:count_verify)
  'inventory.brands': 'brands',
  'inventory.categories': 'categories',
  'inventory.models': 'models',
  'wallet.creditClients': 'credits',
  'wallet.paymentVerification': 'payments',
  'wallet.bankReconciliation': 'payments',
  'thirdParties.customers': 'customers',
  'thirdParties.employees': 'employees',
  'thirdParties.suppliers': 'suppliers',
  'thirdParties.carriers': 'suppliers',
  'reports.dashboard': 'reports',
  'reports.general': 'reports',
  'reports.recycleBin': 'audit',
  'reports.audit': 'audit',
  'settings.company': 'warehouses', // pestaña Empresa (la cuenta propia la ve todo el personal: ver OPEN_STAFF_SCREENS)
  'settings.billing': 'warehouses', // datos fiscales y series de cada bodega
  'settings.rolesPermissions': 'roles', // quien lo tenga puede dar permisos a cualquier empleado, incluso a sí mismo
}

// pantallas que todo el personal ve aunque la matriz no las marque (viven en global/helpers/access/accessLevels)
export { OPEN_STAFF_SCREENS } from '@/global/helpers/access/accessLevels'

// las columnas de la matriz y las acciones de la API que cada una enciende (ver también da el detalle; canEditPrices edita tarifas)
// ojo: change_status y update_prices se retiraron del catálogo (el estado viaja con editar y los precios con edit_prices)
export const MATRIX_ACTIONS = {
  canRead: ['view', 'view_detail'],
  canCreate: ['create'],
  canUpdate: ['edit'],
  canDelete: ['delete'],
  canEditPrices: ['edit_prices'],
} as const

export type MatrixFlag = keyof typeof MATRIX_ACTIONS

// todas las acciones que la matriz sabe poner o quitar; las especiales las maneja SPECIAL_ACTIONS
export const MATRIX_MANAGED_ACTIONS: ReadonlySet<string> = new Set(Object.values(MATRIX_ACTIONS).flat())

// acciones especiales: no caben en ver/crear/editar/borrar y cada una tiene su casilla en el panel de permisos
export interface SpecialAction {
  key: string // modulo:accion de la API
  group: string // título del grupo en el panel
  label: string
}

export const SPECIAL_ACTIONS: SpecialAction[] = [
  { key: 'orders:verify_payment', group: 'Pedidos', label: 'Verificar el pago' },
  { key: 'orders:advance_stage', group: 'Pedidos', label: 'Avanzar etapa (alistar, empacar, despachar, entregar)' },
  { key: 'orders:invoice', group: 'Pedidos', label: 'Facturar' },
  { key: 'invoices:annul', group: 'Pedidos', label: 'Anular factura' },
  { key: 'cash:open_close', group: 'Caja', label: 'Abrir y cerrar turno' },
  { key: 'payments:verify', group: 'Cartera', label: 'Verificar, rechazar o reabrir abonos' },
  { key: 'payments:reconcile', group: 'Cartera', label: 'Conciliar extractos bancarios' },
  { key: 'stock:relocate', group: 'Inventario', label: 'Reubicar productos' },
  { key: 'stock:count', group: 'Inventario', label: 'Registrar conteo físico' },
  { key: 'stock:count_verify', group: 'Inventario', label: 'Verificar y corroborar conteos' },
  { key: 'transfers:receive', group: 'Inventario', label: 'Recibir traslados' },
  { key: 'purchases:receive', group: 'Compras', label: 'Recibir mercancía de compras' },
  { key: 'returns:approve', group: 'Devoluciones', label: 'Aprobar o rechazar devoluciones' },
  { key: 'reports:export', group: 'Reportes', label: 'Exportar a Excel' },
]

export const SPECIAL_ACTION_KEYS: ReadonlySet<string> = new Set(SPECIAL_ACTIONS.map((action) => action.key))

export const apiModuleOf = (moduleId: ERPModule | string, screenId: string): string | null => SCREEN_API_MODULE[`${moduleId}.${screenId}`] ?? null
