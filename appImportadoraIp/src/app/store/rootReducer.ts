// rootReducer · junta los reducers de cada feature (ui, shop, products, cart, wallet, customers, sales, reports, suppliers, inventory, management, quotations, catalogs, warehouses, auth, realtime)
// conecta con: features/*/index, app/store/store
// src/app/store/rootReducer.ts
import { combineReducers } from '@reduxjs/toolkit'
import { navigationReducer } from '@/features/navigation'
import { shopReducer, productsReducer, cartReducer } from '@/features/shop'
import { walletReducer } from '@/features/wallet'
import { authReducer } from '@/features/auth'
import { realtimeReducer } from '@/features/realtime'
import { catalogsReducer } from '@/features/catalogs'
import { customersReducer } from '@/features/customers'
import { warehousesReducer } from '@/features/warehouses'
import { salesReducer } from '@/features/sales'
import { reportsReducer } from '@/features/reports'
import { suppliersReducer } from '@/features/suppliers'
import { inventoryReducer } from '@/features/inventory'
import { managementReducer } from '@/features/management'
import { quotationsReducer } from '@/features/quotations'
// import cajaReducer from '@/features/caja/slices/caja.slice'

export const rootReducer = combineReducers({
    ui: navigationReducer,
    shop: shopReducer,
    cart: cartReducer, // carrito de la venta que viene del backend (no se persiste)
    products: productsReducer, // productos del catálogo que llegan del backend (no se persiste)
    wallet: walletReducer,
    customers: customersReducer, // clientes, direcciones y descuentos del backend (no se persiste)
    catalogs: catalogsReducer, // marcas, categorías y modelos de moto del backend (no se persiste)
    quotations: quotationsReducer, // cotizaciones del backend, solo consulta (no se persiste)
    management: managementReducer, // pedidos por etapa de Gestión Caja (no se persiste)
    inventory: inventoryReducer, // control de inventario del backend (no se persiste)
    suppliers: suppliersReducer, // proveedores del backend (no se persiste)
    reports: reportsReducer, // reportes (ventas, financiero, clientes, inventario) del backend (no se persiste)
    sales: salesReducer, // historial de ventas y carritos pendientes del backend (no se persiste)
    warehouses: warehousesReducer, // bodegas del backend (no se persiste; la bodega ACTIVA vive en ui)
    realtime: realtimeReducer, // estado de la conexión en tiempo real (no se persiste)
    auth: authReducer, // ojo: auth NO está en la whitelist de persistencia; su estado inicial se lee de la sesión guardada
})
