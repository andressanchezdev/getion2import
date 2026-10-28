// rootReducer · junta los reducers de cada feature (ui, shop, products, cart, wallet, customers, catalogs, warehouses, orders, auth, realtime)
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
import { ordersReducer } from '@/features/orders'
// import cajaReducer from '@/features/caja/slices/caja.slice'

export const rootReducer = combineReducers({
    ui: navigationReducer,
    shop: shopReducer,
    cart: cartReducer, // carrito de la venta que viene del backend (no se persiste)
    products: productsReducer, // productos del catálogo que llegan del backend (no se persiste)
    wallet: walletReducer,
    customers: customersReducer, // clientes, direcciones y descuentos del backend (no se persiste)
    catalogs: catalogsReducer, // marcas, categorías y modelos de moto del backend (no se persiste)
    warehouses: warehousesReducer, // bodegas del backend (no se persiste; la bodega ACTIVA vive en ui)
    orders: ordersReducer, // bandeja de pedidos: etapa, tabla y detalle del pedido abierto (no se persiste)
    realtime: realtimeReducer, // estado de la conexión en tiempo real (no se persiste)
    auth: authReducer, // ojo: auth NO está en la whitelist de persistencia; su estado inicial se lee de la sesión guardada
})
