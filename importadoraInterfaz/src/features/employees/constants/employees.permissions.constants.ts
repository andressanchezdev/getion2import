// employees.permissions.constants · a qué módulo de permisos de la API corresponde cada pantalla del menú, y qué acciones son «ver, crear, editar y anular»
// conecta con: employees.adapter (convierte en los dos sentidos); no lo usa nadie más
// ojo: SUPUESTO a confirmar con el negocio: la matriz del menú (módulo + subgestión) se apoya en el módulo de permisos de la API que gobierna esa pantalla;
// una pantalla sin módulo (null) no se puede configurar desde la matriz y queda sin permisos
import type { ERPModule } from '@/features/navigation'

// «módulo.subgestión» del menú → módulo de permisos de la API
export const SCREEN_API_MODULE: Record<string, string | null> = {
  'shop.catalog': 'catalog',
  'shop.quotationCatalog': 'quotations',
  'shop.quotations': 'quotations',
  'shop.orders': 'orders',
  'shop.cashRegister': 'cash',
  'cashRegister.billingHistory': 'orders',
  'cashRegister.returns': 'returns',
  'cashRegister.invoices': 'invoices', // Facturas = lo que pagan las cajas: tiene su propio permiso
  'inventory.stock': 'stock', // existencias por ubicación
  'settings.billing': 'warehouses', // datos fiscales y series de cada bodega
  'purchases.purchaseOrders': 'purchases',
  'purchases.receiving': 'purchases',
  'purchases.suppliers': 'suppliers',
  'inventory.warehouses': 'warehouses',
  'inventory.products': 'products',
  'shop.transfers': 'transfers',
  'inventory.brands': 'brands',
  'inventory.categories': 'categories',
  'inventory.models': 'models',
  'inventory.movements': 'stock',
  'inventory.locations': 'stock',
  'wallet.creditClients': 'credits',
  'wallet.paymentVerification': 'payments',
  'wallet.bankReconciliation': 'payments',
  'thirdParties.customers': 'customers',
  'thirdParties.employees': 'employees',
  'thirdParties.suppliers': 'suppliers',
  'thirdParties.carriers': 'suppliers',
  'settings.rolesPermissions': 'roles', // quien lo tenga puede dar permisos a cualquier empleado, incluso a sí mismo
  'settings.company': 'warehouses',
  'settings.warehouses': 'warehouses',
  'reports.audit': 'audit',
  'reports.dailySales': 'reports',
  'shop.generalReport': 'reports',
  'reports.inventoryReport': 'reports',
  'reports.recycleBin': 'audit',
}

// las columnas de la matriz y las acciones de la API que cada una enciende (ver también da el detalle; editar también cambia el estado; canEditPrices edita tarifas)
export const MATRIX_ACTIONS = {
  canRead: ['view', 'view_detail'],
  canCreate: ['create'],
  canUpdate: ['edit', 'change_status'],
  canDelete: ['delete'],
  canEditPrices: ['edit_prices', 'update_prices'],
} as const

export type MatrixFlag = keyof typeof MATRIX_ACTIONS

// todas las acciones que la matriz sabe poner o quitar; las demás (tomar etapas, verificar pagos…) no se tocan al guardar
export const MATRIX_MANAGED_ACTIONS: ReadonlySet<string> = new Set(Object.values(MATRIX_ACTIONS).flat())

export const apiModuleOf = (moduleId: ERPModule | string, screenId: string): string | null => SCREEN_API_MODULE[`${moduleId}.${screenId}`] ?? null
