// masterData.realtime · datos maestros en tiempo real: entity.created, entity.updated, entity.archived y entity.restored
// conecta con: realtimeRegistry (lo registra) y los thunks de carga de clientes, empleados, roles, terceros, compañías, bodegas, ubicaciones, catálogos, productos y administradores
// ojo: cada tabla tiene su propio adaptador y sus filtros de servidor, así que aquí no se parchea la fila: la lista de ese dato se vuelve a pedir UNA vez
// (con espera, por si llegan varios eventos seguidos) y solo si ya estaba cargada. El cambio de estado (entity.status_changed) sí se aplica sin pedir nada, en cada feature
import type { RealtimeHandlers } from '@/features/realtime'
import type { EntityKind } from '@/features/realtime'
import { fetchBrandsThunk, fetchCategoriesThunk, fetchMotoModelsThunk } from '@/features/catalogs/thunks/catalogs.thunks'
import { loadCompaniesThunk } from '@/features/companies/thunks/companies.thunks'
import { loadCustomersThunk } from '@/features/customers/thunks/customers.thunks'
import { loadEmployeesThunk, loadRolesThunk } from '@/features/employees/thunks/employees.thunks'
import { loadExternalsThunk } from '@/features/externals/thunks/externals.thunks'
import { loadProductsTableThunk } from '@/features/inventory/thunks/inventory.thunks'
import { loadLocationsThunk } from '@/features/locations/thunks/locations.thunks'
import { loadAdminsThunk } from '@/features/superadmin/thunks/superadmin.thunks'
import { loadManagedWarehousesThunk } from '@/features/warehouses/thunks/warehouses.thunks'
import type { AppDispatch, RootState } from './store'

export const MASTER_RELOAD_DELAY_MS = 400

type Api = { dispatch: AppDispatch; getState: () => RootState }

// qué lista se vuelve a pedir por cada dato maestro, y solo si ya estaba cargada
const RELOADERS: Partial<Record<EntityKind, (api: Api) => void>> = {
  customer: ({ dispatch, getState }) => {
    if (getState().customers.list.status === 'succeeded') void dispatch(loadCustomersThunk())
  },
  employee: ({ dispatch, getState }) => {
    const { directory } = getState().employees
    if (directory.status === 'succeeded') void dispatch(loadEmployeesThunk(directory.warehouseId))
  },
  role: ({ dispatch, getState }) => {
    if (getState().employees.roles.status === 'succeeded') void dispatch(loadRolesThunk())
  },
  supplier: ({ dispatch, getState }) => {
    const { kind, status } = getState().externals
    if (kind === 'supplier' && status === 'succeeded') void dispatch(loadExternalsThunk('supplier'))
  },
  carrier: ({ dispatch, getState }) => {
    const { kind, status } = getState().externals
    if (kind === 'carrier' && status === 'succeeded') void dispatch(loadExternalsThunk('carrier'))
  },
  company: ({ dispatch, getState }) => {
    if (getState().companies.status === 'succeeded') void dispatch(loadCompaniesThunk())
  },
  warehouse: ({ dispatch, getState }) => {
    if (getState().warehouses.managedStatus === 'succeeded') void dispatch(loadManagedWarehousesThunk())
  },
  location: ({ dispatch, getState }) => {
    const { list } = getState().locations
    if (list.status === 'succeeded' && list.warehouseId > 0) void dispatch(loadLocationsThunk(list.warehouseId))
  },
  brand: ({ dispatch, getState }) => {
    if (getState().catalogs.brands.status === 'succeeded') void dispatch(fetchBrandsThunk())
  },
  category: ({ dispatch, getState }) => {
    if (getState().catalogs.categories.status === 'succeeded') void dispatch(fetchCategoriesThunk())
  },
  model: ({ dispatch, getState }) => {
    if (getState().catalogs.models.status === 'succeeded') void dispatch(fetchMotoModelsThunk())
  },
  product: ({ dispatch, getState }) => {
    const { products } = getState().inventory
    if (products.status === 'succeeded') void dispatch(loadProductsTableThunk({ page: products.page, query: products.query }))
  },
  admin: ({ dispatch, getState }) => {
    const { items, loading } = getState().superadmin
    if (items.length > 0 && !loading) void dispatch(loadAdminsThunk())
  },
}

const timers = new Map<EntityKind, ReturnType<typeof setTimeout>>()

// varios eventos seguidos del mismo dato (una importación, un guardado con varias filas) piden la lista una sola vez
export const reloadMasterListSoon = (kind: EntityKind, api: Api): void => {
  const reload = RELOADERS[kind]
  if (!reload) return
  const pending = timers.get(kind)
  if (pending) clearTimeout(pending)
  timers.set(
    kind,
    setTimeout(() => {
      timers.delete(kind)
      reload(api)
    }, MASTER_RELOAD_DELAY_MS)
  )
}

const onEntity = (event: { data: { entity: { kind: string } } }, api: unknown): void => reloadMasterListSoon(event.data.entity.kind as EntityKind, api as Api)

export const masterDataRealtimeHandlers: RealtimeHandlers = {
  'entity.created': [onEntity],
  'entity.updated': [onEntity],
  'entity.archived': [onEntity],
  'entity.restored': [onEntity],
}
