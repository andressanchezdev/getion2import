// orders.realtime.test · pruebas unitarias de los manejadores en tiempo real de pedidos
import { describe, expect, it } from 'vitest'
import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { ordersReducer } from '../slices/orders.slice'
import { ordersRealtimeHandlers } from './orders.realtime'
import type { RealtimeEnvelope, RealtimeEventType } from '@/features/realtime'

const testReducer = combineReducers({
  orders: ordersReducer,
  auth: () => ({ user: { userId: 99, userType: 'employee' } }),
  ui: () => ({ activeWarehouseId: '1' }),
})

const createTestStore = (initialState?: Record<string, unknown>) =>
  configureStore({ reducer: testReducer, preloadedState: initialState as ReturnType<typeof testReducer> | undefined })

const wrap = <T extends RealtimeEventType>(type: T, data: unknown): RealtimeEnvelope<T> =>
  ({
    v: 1,
    seq: 100,
    id: 'evt-test-1',
    type,
    occurredAt: '2026-11-12T10:00:00Z',
    companyId: 1,
    warehouseIds: [1],
    actor: { type: 'employee', id: 5, name: 'Pedro' },
    data,
  }) as unknown as RealtimeEnvelope<T>

describe('ordersRealtimeHandlers', () => {
  it('agrega pedido en sale.created e incrementa el contador de verificación', () => {
    const store = createTestStore({
      orders: {
        stage: 'verification',
        channel: 'all',
        query: '',
        selectedWarehouseId: 1,
        counts: { verification: 2, picking: 1, packing: 0, invoicing: 0, dispatch: 0 },
        list: { items: [], status: 'succeeded', error: null, requestId: null, capped: false },
        openId: null,
        detail: { data: null, status: 'idle', error: null, requestId: null },
      },
    })

    const handler = ordersRealtimeHandlers['sale.created']?.[0]
    expect(handler).toBeDefined()

    handler!(
      wrap('sale.created', {
        sale: {
          id: 501,
          serial: 'PED-000501',
          customerName: 'Cliente Prueba',
          currentStage: 'verification',
          status: 'open',
          total: 100000,
          paidTotal: 0,
          updatedAt: '2026-11-12T10:00:00Z',
        },
      }),
      { dispatch: store.dispatch, getState: store.getState } as never
    )

    const state = store.getState().orders
    expect(state.list.items).toHaveLength(1)
    expect(state.list.items[0].id).toBe(501)
    expect(state.list.items[0].serial).toBe('PED-000501')
    expect(state.counts?.verification).toBe(3)
  })

  it('quita el pedido de la lista cuando avanza a otra etapa en sale.stage_changed', () => {
    const store = createTestStore({
      orders: {
        stage: 'verification',
        channel: 'all',
        query: '',
        selectedWarehouseId: 1,
        counts: { verification: 3, picking: 1, packing: 0, invoicing: 0, dispatch: 0 },
        list: {
          items: [
            {
              id: 501,
              serial: 'PED-000501',
              stage: 'verification',
              channel: 'standard',
              customerName: 'Cliente Prueba',
              sellerName: 'Vendedor',
              paymentMethod: 'cash',
              totalAmount: 100000,
              createdAt: '2026-11-12',
              paused: false,
              paymentVerified: false,
              locationVerified: false,
              paidAmount: 0,
              creditAmount: 0,
              confirmed: false,
              currentStage: 'verification',
            },
          ],
          status: 'succeeded',
          error: null,
          requestId: null,
          capped: false,
        },
        openId: 501,
        detail: {
          data: {
            id: 501,
            serial: 'PED-000501',
            status: 'open',
            stage: 'verification',
            channel: 'standard',
            paymentMethod: 'cash',
            totalAmount: 100000,
            shippingCost: 0,
            createdAt: '2026-11-12',
            updatedAt: '2026-11-12T10:00:00Z',
            paused: false,
            cancelled: false,
            paymentVerified: false,
            locationVerified: false,
            customer: { name: 'Cliente', document: '123', email: 'c@test.com', priceType: 'p1' },
            seller: { name: 'Vendedor', document: '456', email: 'v@test.com', priceType: 'p1' },
            lines: [],
            payments: [],
            history: [],
          },
          status: 'succeeded',
          error: null,
          requestId: null,
        },
      },
    })

    const handler = ordersRealtimeHandlers['sale.stage_changed']?.[0]
    expect(handler).toBeDefined()

    handler!(
      wrap('sale.stage_changed', {
        entity: { id: 501, version: '2026-11-12T10:05:00Z' },
        serial: 'PED-000501',
        from: 'verification',
        to: 'picking',
        status: 'open',
      }),
      { dispatch: store.dispatch, getState: store.getState } as never
    )

    const state = store.getState().orders
    // como la pantalla está en 'verification' y el pedido pasó a 'picking', sale de la lista
    expect(state.list.items).toHaveLength(0)
    expect(state.counts?.verification).toBe(2)
    expect(state.counts?.picking).toBe(2)
    // el detalle abierto refleja la nueva etapa
    expect(state.detail.data?.stage).toBe('picking')
  })

  it('actualiza estado de pago con sale.payment_changed', () => {
    const store = createTestStore({
      orders: {
        stage: 'verification',
        channel: 'all',
        query: '',
        selectedWarehouseId: 1,
        counts: null,
        list: {
          items: [
            {
              id: 501,
              serial: 'PED-000501',
              stage: 'verification',
              channel: 'standard',
              customerName: 'Cliente Prueba',
              sellerName: 'Vendedor',
              paymentMethod: 'transfer',
              totalAmount: 100000,
              createdAt: '2026-11-12',
              paused: false,
              paymentVerified: false,
              locationVerified: false,
              paidAmount: 0,
              creditAmount: 0,
              confirmed: false,
              currentStage: 'verification',
            },
          ],
          status: 'succeeded',
          error: null,
          requestId: null,
          capped: false,
        },
        openId: 501,
        detail: {
          data: {
            id: 501,
            serial: 'PED-000501',
            status: 'open',
            stage: 'verification',
            channel: 'standard',
            paymentMethod: 'transfer',
            totalAmount: 100000,
            shippingCost: 0,
            createdAt: '2026-11-12',
            updatedAt: '2026-11-12T10:00:00Z',
            paused: false,
            cancelled: false,
            paymentVerified: false,
            locationVerified: false,
            customer: { name: 'Cliente', document: '123', email: 'c@test.com', priceType: 'p1' },
            seller: { name: 'Vendedor', document: '456', email: 'v@test.com', priceType: 'p1' },
            lines: [],
            payments: [],
            history: [],
          },
          status: 'succeeded',
          error: null,
          requestId: null,
        },
      },
    })

    const handler = ordersRealtimeHandlers['sale.payment_changed']?.[0]
    expect(handler).toBeDefined()

    handler!(
      wrap('sale.payment_changed', {
        saleId: 501,
        paidTotal: 100000,
        creditAmount: 0,
        balance: 0,
        paymentVerified: true,
        version: '2026-11-12T10:10:00Z',
      }),
      { dispatch: store.dispatch, getState: store.getState } as never
    )

    const state = store.getState().orders
    expect(state.list.items[0].paidAmount).toBe(100000)
    expect(state.list.items[0].paymentVerified).toBe(true)
    expect(state.detail.data?.paymentVerified).toBe(true)
  })
})

