// rootReducer · junta los reducers de cada feature (ui, shop, products, cart, wallet, customers, catalogs, warehouses, orders, returns, settings, superadmin, locations, auth, realtime)
// conecta con: features/*/index, app/store/store
// src/app/store/rootReducer.ts
import { combineReducers } from '@reduxjs/toolkit'
import { navigationReducer, setActiveCompany } from '@/features/navigation'
import { shopReducer, productsReducer, cartReducer } from '@/features/shop'
import { walletReducer } from '@/features/wallet'
import { authReducer } from '@/features/auth'
import { realtimeReducer } from '@/features/realtime'
import { catalogsReducer } from '@/features/catalogs'
import { customersReducer } from '@/features/customers'
import { warehousesReducer } from '@/features/warehouses'
import { ordersReducer } from '@/features/orders'
import { returnsReducer } from '@/features/returns'
import { settingsReducer } from '@/features/settings'
import { superadminReducer } from '@/features/superadmin'
import { quotationDraftReducer, quotationsReducer } from '@/features/quotations'
import { employeesReducer } from '@/features/employees'
import { inventoryReducer } from '@/features/inventory'
import { companiesReducer } from '@/features/companies'
import { transfersReducer } from '@/features/transfers'
import { auditReducer } from '@/features/audit'
import { bankReducer } from '@/features/bank'
import { locationsReducer } from '@/features/locations'
import { cashReducer } from '@/features/cashRegister'
import { reportsReducer } from '@/features/reports'
import { purchasesReducer } from '@/features/purchases'
import { billingReducer } from '@/features/billing'
import { externalsReducer } from '@/features/externals'

const appReducer = combineReducers({
    ui: navigationReducer,
    shop: shopReducer,
    cart: cartReducer, // carrito de la venta que viene del backend (no se persiste)
    products: productsReducer, // productos del catálogo que llegan del backend (no se persiste)
    wallet: walletReducer,
    customers: customersReducer, // clientes, direcciones y descuentos del backend (no se persiste)
    catalogs: catalogsReducer, // marcas, categorías y modelos de moto del backend (no se persiste)
    warehouses: warehousesReducer, // bodegas del backend (no se persiste; la bodega ACTIVA vive en ui)
    orders: ordersReducer, // bandeja de pedidos: etapa, tabla y detalle del pedido abierto (no se persiste)
    returns: returnsReducer, // devoluciones: lista y filtros (no se persiste)
    settings: settingsReducer, // configuración: ficha de la empresa e imagen del protector (no se persiste)
    superadmin: superadminReducer, // gestión de administradores del superadmin: lista y filtros (no se persiste)
    companies: companiesReducer, // compañías registradas (solo superadmin; no se vacía al saltar de compañía, no se persiste)
    inventory: inventoryReducer, // tablas de inventario: productos y stock de la bodega activa (no se persiste)
    employees: employeesReducer, // empleados y roles del backend (no se persiste)
    quotations: quotationsReducer, // cotizaciones: lista, filtros y detalle abierto (no se persiste)
    quotationDraft: quotationDraftReducer, // la cotización que se arma en «Cotizar», separada del carrito (no se persiste)
    audit: auditReducer, // auditoría: filtros, página y movimientos del backend (no se persiste)
    bank: bankReducer, // conciliación bancaria: movimientos del PDF del banco y pagos por verificar (no se persiste)
    locations: locationsReducer, // ubicaciones (estantes) de la bodega abierta y su contenido (no se persiste)
    externals: externalsReducer, // proveedores o transportadoras del backend (no se persiste)
    billing: billingReducer, // facturas, datos fiscales y series de la bodega activa (no se persiste)
    purchases: purchasesReducer, // órdenes de compra de la bodega activa y su detalle (no se persiste)
    reports: reportsReducer, // reporte general de la bodega (no se persiste)
    cash: cashReducer, // turno de caja de la bodega activa (no se persiste)
    transfers: transfersReducer, // traslados: lista de la bodega, existencias y buscador de productos (no se persiste)
    realtime: realtimeReducer, // estado de la conexión en tiempo real (no se persiste)
    auth: authReducer, // ojo: auth NO está en la whitelist de persistencia; su estado inicial se lee de la sesión guardada
})

export type RootState = ReturnType<typeof appReducer>

// al saltar de compañía (superadmin) se vacían los datos de las demás features para que se vuelvan a pedir de la compañía nueva;
// se conservan la navegación, la sesión, el tiempo real, la lista de compañías y el control interno de la persistencia (_persist)
export const rootReducer: typeof appReducer = (state, action) => {
  if (state && setActiveCompany.match(action)) {
    const { ui, auth, realtime, companies, _persist } = state as RootState & { _persist?: unknown }
    return appReducer({ ui, auth, realtime, companies, _persist } as unknown as RootState, action)
  }
  return appReducer(state, action)
}
