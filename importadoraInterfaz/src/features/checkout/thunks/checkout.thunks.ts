// checkout.thunks · buscar cliente, cargarlo con su cupo, armar los renglones (carrito o cotización) y confirmar la venta o la cotización
// conecta con: checkout.service (clientes), shop (renglones del carrito, createSale, stockId y vaciar el carrito), quotations (detalle y crear cotización) y auth (sesión); las despacha CheckoutPanel
// ojo: el carrito solo se vacía si la venta o la cotización se creó; si falla (por ejemplo stock agotado por otro pedido) queda intacto y se devuelve el mensaje de la API
// ojo: el administrador no vende por sí mismo: la venta se le asigna a un empleado (salespersonEmployeeId); un vendedor vende con su propio usuario
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { selectRequestContext } from '@/features/auth'
import { clearDraft, createQuotation, fetchQuotationDetail } from '@/features/quotations'
import { clearCartThunk, createSale, findStockId, selectCartItems, toWarehouseNumber, type ThunkConfig } from '@/features/shop'
import { fetchCheckoutCustomer, searchCheckoutCustomers } from '../services/checkout.service'
import { toShippingAddress } from '../helpers/checkout.adapter'
import type { CheckoutCustomer, CheckoutLine, CheckoutPayload, DeliveryData, PaymentChoice } from '../types/checkout.types'

const NO_SESSION = 'No hay una sesión activa.'
const NO_WAREHOUSE = 'Elige una bodega antes de finalizar la compra.'

export const searchCheckoutCustomersThunk = createAsyncThunk<CheckoutCustomer[], string, ThunkConfig>('checkout/searchCustomers', async (query, { getState, rejectWithValue }) => {
  const ctx = selectRequestContext(getState())
  if (!ctx) return rejectWithValue(NO_SESSION)
  try {
    return await searchCheckoutCustomers(ctx, query)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron buscar los clientes.'))
  }
})

export const loadCheckoutCustomerThunk = createAsyncThunk<CheckoutCustomer, number, ThunkConfig>('checkout/loadCustomer', async (id, { rejectWithValue }) => {
  try {
    return await fetchCheckoutCustomer(id)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo cargar el cliente.'))
  }
})

// los renglones: del borrador de la cotización, del carrito, o de la cotización que continúa (cada producto con la ubicación de la bodega activa que tenga stock suficiente)
export const loadCheckoutLinesThunk = createAsyncThunk<CheckoutLine[], CheckoutPayload, ThunkConfig>('checkout/loadLines', async (payload, { getState, rejectWithValue }) => {
  const state = getState()
  const ctx = selectRequestContext(state)
  if (!ctx) return rejectWithValue(NO_SESSION)
  try {
    if (payload.lines) return payload.lines
    if (!payload.quotationId) {
      return selectCartItems(state).map((item) => ({ productId: Number(item.productId), stockId: item.stockId ?? 0, name: item.product.name, quantity: item.quantity, unitPrice: item.selectedPrice, ivaPercent: item.product.iva ?? 0 }))
    }
    const warehouseId = toWarehouseNumber(state.ui.activeWarehouseId)
    if (!warehouseId) return rejectWithValue(NO_WAREHOUSE)
    const quotation = await fetchQuotationDetail(ctx, payload.quotationId)
    return await Promise.all(
      quotation.items.map(async (item) => ({
        productId: item.productId,
        stockId: await findStockId(ctx, warehouseId, item.productId, item.quantity),
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }))
    )
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo preparar la compra.'))
  }
})

interface ConfirmArgs {
  payload: CheckoutPayload
  customer: CheckoutCustomer
  lines: CheckoutLine[]
  delivery: DeliveryData
  payment: PaymentChoice
  salespersonEmployeeId?: number // obligatorio cuando quien confirma es administrador o superadmin
  immediatePicking?: boolean
  proofUrl?: string
  paymentReference?: string
}

// crea el pedido (POST /sales) con el descuento general del cliente en cada renglón; devuelve el consecutivo para mostrarlo
export const confirmSaleThunk = createAsyncThunk<{ id: number; serialCode: string }, ConfirmArgs, ThunkConfig>('checkout/confirmSale', async (args, { getState, dispatch, rejectWithValue }) => {
  const state = getState()
  if (!selectRequestContext(state)) return rejectWithValue(NO_SESSION)
  const warehouseId = toWarehouseNumber(state.ui.activeWarehouseId)
  if (!warehouseId) return rejectWithValue(NO_WAREHOUSE)
  try {
    const sale = await createSale({
      warehouseId,
      customerId: args.customer.id,
      salespersonEmployeeId: args.salespersonEmployeeId,
      quotationId: args.payload.quotationId,
      paymentMethod: args.payment,
      paymentCondition: args.payment === 'credit' ? 'credit' : 'cash',
      immediatePicking: args.immediatePicking,
      proofUrl: args.proofUrl,
      paymentReference: args.paymentReference,
      shippingAddress: toShippingAddress(args.delivery),
      items: args.lines.map((line) => ({ stockId: line.stockId, quantity: line.quantity, unitPrice: line.unitPrice, discount: args.customer.discountPercent || undefined })),
    })
    if (!args.payload.quotationId) await dispatch(clearCartThunk())
    return { id: sale.id, serialCode: sale.serialCode }
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo crear el pedido.'))
  }
})

// crea la cotización del cliente con los renglones del borrador y lo vacía; quien la hace queda registrado (también si es el administrador)
export const confirmQuotationThunk = createAsyncThunk<number, { customer: CheckoutCustomer; lines: CheckoutLine[] }, ThunkConfig>('checkout/confirmQuotation', async ({ customer, lines }, { getState, dispatch, rejectWithValue }) => {
  if (!selectRequestContext(getState())) return rejectWithValue(NO_SESSION)
  try {
    const id = await createQuotation({ customerId: customer.id, items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitPrice: line.unitPrice })) })
    dispatch(clearDraft())
    return id
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo crear la cotización.'))
  }
})
