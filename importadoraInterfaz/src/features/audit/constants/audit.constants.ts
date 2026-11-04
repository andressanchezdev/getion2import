// audit.constants · gestiones y tipos de actor con su texto en español, y tamaño de página de la auditoría
// conecta con: audit.adapter (etiquetas) y AuditFilters (opciones del filtro de gestión)
// ojo: las claves son las que la API escribe en audit_logs.entity; una gestión nueva sin etiqueta se muestra con su clave
import type { AuditFilters, AuditState } from '../types/audit.types'
import { DEFAULT_PAGE_SIZE } from '@/api'

export const AUDIT_PAGE_SIZE = DEFAULT_PAGE_SIZE

export const EMPTY_AUDIT_FILTERS: AuditFilters = {
  entity: '',
  action: '',
  role: '',
  from: '',
  to: '',
}

export const INITIAL_AUDIT_STATE: AuditState = {
  filters: EMPTY_AUDIT_FILTERS,
  page: 1,
  list: { items: [], meta: null, status: 'idle', error: null, requestId: null },
}

export const AUDIT_ENTITIES: Record<string, string> = {
  customers: 'Clientes',
  customer_documents: 'Documentos de clientes',
  products: 'Productos',
  product_codes: 'Códigos de producto',
  product_suppliers: 'Proveedores de producto',
  brands: 'Marcas',
  categories: 'Categorías',
  models: 'Modelos',
  stock: 'Existencias',
  transfers: 'Traslados',
  counts: 'Conteos físicos',
  purchases: 'Compras',
  quotations: 'Cotizaciones',
  payments: 'Pagos',
  credit_entries: 'Movimientos de crédito',
  externals: 'Terceros externos',
  warehouses: 'Bodegas',
  warehouse_facturation: 'Facturación por bodega',
  doc_series: 'Series de documentos',
  employees: 'Empleados',
  employee_permissions: 'Permisos de empleados',
  employee_login_attempts: 'Intentos de ingreso',
  roles: 'Roles',
  admins: 'Administradores',
  companies: 'Compañías',
  auth: 'Sesiones',
}

export const AUDIT_ACTORS: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Administrador',
  employee: 'Empleado',
}

export const AUDIT_ROLE_OPTIONS = [
  { value: '', label: 'Todos los roles' },
  { value: 'admin', label: 'Administrador' },
  { value: 'employee', label: 'Empleado' },
  { value: 'superadmin', label: 'Superadmin' },
]

export const AUDIT_ACTION_OPTIONS = [
  { value: '', label: 'Todas las acciones' },
  { value: 'LOGIN', label: 'Inicios de sesión (Login)' },
  { value: 'CREATE', label: 'Creaciones (Create)' },
  { value: 'UPDATE', label: 'Modificaciones (Update)' },
  { value: 'DELETE', label: 'Eliminaciones / Anulaciones (Delete)' },
]
