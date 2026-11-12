// shop.realtime · manejadores en tiempo real del catálogo y del carrito: stock.changed, cart.updated y entity.status_changed (producto y cliente)
// conecta con: shop.products.slice, shop.cart.slice, shop.slice y realtimeRegistry
import type { RealtimeHandlers } from '@/features/realtime'
import { cartProductStatusFromEvent, cartStockChangedFromEvent, cartUpdatedFromEvent } from '../slices/shop.cart.slice'
import { productStatusFromEvent, stockTotalsFromEvent, productPricesFromEvent } from '../slices/shop.products.slice'
import { cartCustomerStatusFromEvent } from '../slices/shop.slice'
import type { ProductDto } from '../types/shop.api.types'
import type { CartDto } from '../types/shop.cart.api.types'

export const shopRealtimeHandlers: RealtimeHandlers = {
    'product.prices_changed': [(event, { dispatch }) => void dispatch(productPricesFromEvent(event.data))],
    'stock.changed': [
        (event, { dispatch }) => {
            dispatch(stockTotalsFromEvent(event.data.totals))
            dispatch(cartStockChangedFromEvent(event.data.rows))
        },
    ],
    'cart.updated': [
        (event, { dispatch }) => {
            dispatch(
                cartUpdatedFromEvent({
                    cart: (event.data.cart as unknown as CartDto | null) ?? null,
                    version: event.occurredAt,
                })
            )
        },
    ],
    'entity.status_changed': [
        (event, { dispatch, getState }) => {
            const { entity, to, row } = event.data
            if (entity.kind === 'product') {
                const rawWh = (getState() as { ui?: { activeWarehouseId?: string } }).ui?.activeWarehouseId
                const activeWarehouseId = rawWh ? Number(rawWh) : undefined
                dispatch(
                    productStatusFromEvent({
                        id: entity.id,
                        version: entity.version,
                        to,
                        row: (row as unknown as ProductDto | null) ?? null,
                        activeWarehouseId: Number.isFinite(activeWarehouseId) ? activeWarehouseId : undefined,
                    })
                )
                dispatch(cartProductStatusFromEvent({ productId: String(entity.id), status: to }))
            } else if (entity.kind === 'customer') {
                dispatch(cartCustomerStatusFromEvent({ customerId: entity.id, status: to }))
            }
        },
    ],
}

