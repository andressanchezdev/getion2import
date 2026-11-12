// realtimeRegistry · único punto donde se registran los manejadores de eventos de todas las features y el mapa de recarga por pantalla activa
// conecta con: realtime.router (registerRealtimeHandlers), realtime.thunks (ensureRealtimeRegistry, resyncVisibleScreen) y features/auth
import type { AppDispatch, RootState } from './store'
import { fetchCurrentUserThunk, logoutThunk } from '@/features/auth'
import { registerRealtimeHandlers } from '@/features/realtime/helpers/realtime.router'
import { shopRealtimeHandlers } from '@/features/shop/realtime/shop.realtime'
import { inventoryRealtimeHandlers } from '@/features/inventory/realtime/inventory.realtime'
import { transfersRealtimeHandlers } from '@/features/transfers/realtime/transfers.realtime'
import { warehousesRealtimeHandlers } from '@/features/warehouses/realtime/warehouses.realtime'
import { navigationRealtimeHandlers } from '@/features/navigation/realtime/navigation.realtime'
import { locationsRealtimeHandlers } from '@/features/locations/realtime/locations.realtime'
import { catalogsRealtimeHandlers } from '@/features/catalogs/realtime/catalogs.realtime'
import { customersRealtimeHandlers } from '@/features/customers/realtime/customers.realtime'
import { employeesRealtimeHandlers } from '@/features/employees/realtime/employees.realtime'
import { externalsRealtimeHandlers } from '@/features/externals/realtime/externals.realtime'
import { companiesRealtimeHandlers } from '@/features/companies/realtime/companies.realtime'
import { superadminRealtimeHandlers } from '@/features/superadmin/realtime/superadmin.realtime'
import { ordersRealtimeHandlers } from '@/features/orders'
import { billingRealtimeHandlers } from '@/features/billing/realtime/billing.realtime'
import { walletRealtimeHandlers } from '@/features/wallet/realtime/wallet.realtime'
import { bankRealtimeHandlers } from '@/features/bank/realtime/bank.realtime'
import { cashRealtimeHandlers } from '@/features/cashRegister/realtime/cash.realtime'
import { purchasesRealtimeHandlers } from '@/features/purchases/realtime/purchases.realtime'
import { returnsRealtimeHandlers } from '@/features/returns/realtime/returns.realtime'
import { quotationsRealtimeHandlers } from '@/features/quotations/realtime/quotations.realtime'
import { recycleBinRealtimeHandlers } from '@/features/recyclebin/realtime/recyclebin.realtime'
import { masterDataRealtimeHandlers } from './masterData.realtime'

export type ScreenResyncFn = (api: { dispatch: AppDispatch; getState: () => RootState }) => Promise<unknown> | void

const screenResyncMap = new Map<string, ScreenResyncFn>()

export const registerScreenResync = (
  moduleId: string,
  subitemId: string | '*',
  fn: ScreenResyncFn
): void => {
  screenResyncMap.set(`${moduleId}:${subitemId}`, fn)
}

export const runActiveScreenResync = async (api: {
  dispatch: AppDispatch
  getState: () => RootState
}): Promise<void> => {
  const { activeModule, activeSubitem } = api.getState().ui
  const exact = screenResyncMap.get(`${activeModule}:${activeSubitem || ''}`)
  const fallback = screenResyncMap.get(`${activeModule}:*`)
  const fn = exact ?? fallback
  if (fn) {
    await fn(api)
  }
}

let initialized = false

export const ensureRealtimeRegistry = (): void => {
  if (initialized) return
  initialized = true

  registerRealtimeHandlers({
    'session.revoked': [
      (event, { dispatch }) => {
        const reason = event.data.reason
        const logoutReason =
          reason === 'account_inactive' ||
          reason === 'company_inactive' ||
          reason === 'warehouse_inactive'
            ? 'suspended'
            : 'remote'
        void dispatch(logoutThunk(logoutReason))
      },
    ],
    'permissions.changed': [
      (_event, { dispatch }) => {
        void dispatch(fetchCurrentUserThunk())
      },
    ],
    'account.updated': [
      (_event, { dispatch }) => {
        void dispatch(fetchCurrentUserThunk())
      },
    ],
  })

  // piloto E8: stock, traslados y activo ⇄ inactivo
  for (const handlers of [
    shopRealtimeHandlers,
    inventoryRealtimeHandlers,
    transfersRealtimeHandlers,
    warehousesRealtimeHandlers,
    navigationRealtimeHandlers,
    locationsRealtimeHandlers,
    catalogsRealtimeHandlers,
    customersRealtimeHandlers,
    employeesRealtimeHandlers,
    externalsRealtimeHandlers,
    companiesRealtimeHandlers,
    superadminRealtimeHandlers,
    ordersRealtimeHandlers,
    billingRealtimeHandlers,
    walletRealtimeHandlers,
    bankRealtimeHandlers,
    cashRealtimeHandlers,
    purchasesRealtimeHandlers,
    returnsRealtimeHandlers,
    quotationsRealtimeHandlers,
    masterDataRealtimeHandlers,
    recycleBinRealtimeHandlers,
  ]) {
    registerRealtimeHandlers(handlers)
  }
}

