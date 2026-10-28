// wallet.thunks.test · pruebas de cartera con el slice real: lista, totales, facturas, abonos y cambio de cupo (con red, sesión y alertas simuladas)
// conecta con: wallet.thunks, wallet.payments.thunks y wallet.slice
import { configureStore, type ThunkDispatch, type UnknownAction } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthState } from '@/features/auth'
import { navigationReducer, setActiveWarehouse, type NavigationState } from '@/features/navigation'
import { toast } from '@/global/helpers/toast'
import { setAccountDrawerOpen, setSelectedCustomer, setWalletPage, walletReducer } from '../slices/wallet.slice'
import { loadInvoicesThunk, loadWalletSummaryThunk, loadWalletThunk } from './wallet.thunks'
import { payThunk, updateCreditThunk } from './wallet.payments.thunks'
import { fetchCustomerInvoices, fetchWalletPage, fetchWalletSummary } from '../services/wallet.service'
import { registerPayment, updateCredit } from '../services/wallet.payments.service'
import type { CreditInvoice, CustomerCreditProfile, WalletState, WalletSummary } from '../types/wallet.types'

vi.mock('../services/wallet.service', () => ({
  fetchWalletPage: vi.fn(),
  fetchWalletSummary: vi.fn(),
  fetchCustomerInvoices: vi.fn(),
}))
vi.mock('../services/wallet.payments.service', () => ({ registerPayment: vi.fn(), updateCredit: vi.fn() }))
vi.mock('@/global/helpers/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/features/auth', () => ({
  selectRequestContext: (state: { auth: { ctx: unknown } }) => state.auth.ctx,
}))

const ctx = { companyId: 3, userId: 7 }
const meta = { currentPage: 1, pageSize: 30, totalRecords: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false }

// ojo: el dispatch se tipa a mano para aceptar thunks que leen varios slices (el store de prueba solo tiene los que se prueban)
const makeStore = (sessionCtx: unknown = ctx) => {
  const store = configureStore({
    reducer: { auth: (state = { ctx: sessionCtx } as unknown as AuthState) => state, ui: navigationReducer, wallet: walletReducer },
  })
  store.dispatch(setActiveWarehouse({ id: '4', name: 'Sur' }))
  const dispatch = store.dispatch as unknown as ThunkDispatch<{ auth: AuthState; ui: NavigationState; wallet: WalletState }, undefined, UnknownAction>
  return { store, dispatch }
}

const customer: CustomerCreditProfile = {
  id: 5, documentId: '123', businessName: 'Ana Pérez', creditDays: 30, isCredit: true,
  creditLimit: 1000, usedCredit: 800, reservedCredit: 0, availableCredit: 200, creditStatus: 'withBalance',
}
const invoice = (saleId: number, issueDate: string, pendingBalance: number): CreditInvoice => ({
  id: String(saleId), saleId, invoiceNumber: `#${saleId}`, orderNumber: `Venta ${saleId}`, issueDate, dueDate: issueDate,
  totalAmount: pendingBalance, paidAmount: 0, pendingBalance, daysOverdue: 0, status: 'current',
})
const summary: WalletSummary = {
  totalCreditExtended: 1000, totalOutstandingDebt: 800, totalAvailableCredit: 200, customersOverdue: 1, totalCustomersWithCredit: 1, averageCreditDays: 30,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchWalletPage).mockResolvedValue({ items: [customer], meta })
  vi.mocked(fetchWalletSummary).mockResolvedValue(summary)
  vi.mocked(fetchCustomerInvoices).mockResolvedValue([invoice(1, '2026-09-01', 500), invoice(2, '2026-10-01', 300)])
  vi.mocked(registerPayment).mockResolvedValue(undefined)
  vi.mocked(updateCredit).mockResolvedValue(undefined)
})

describe('carga de cartera', () => {
  it('pide la página actual con la bodega activa y guarda clientes y meta', async () => {
    const { store, dispatch } = makeStore()
    store.dispatch(setWalletPage(2))
    await dispatch(loadWalletThunk())
    expect(fetchWalletPage).toHaveBeenCalledWith(ctx, 2, 30, 4)
    expect(store.getState().wallet.list).toMatchObject({ status: 'succeeded', meta })
    expect(store.getState().wallet.list.items).toHaveLength(1)
  })

  it('si falla deja el mensaje y el estado "failed"', async () => {
    vi.mocked(fetchWalletPage).mockRejectedValue({ userFriendlyMessage: 'Servidor caído' })
    const { store, dispatch } = makeStore()
    await dispatch(loadWalletThunk())
    expect(store.getState().wallet.list).toMatchObject({ status: 'failed', error: 'Servidor caído' })
  })

  it('sin sesión no llama al backend', async () => {
    const { dispatch } = makeStore(null)
    await dispatch(loadWalletThunk())
    expect(fetchWalletPage).not.toHaveBeenCalled()
  })

  it('si llegan dos cargas seguidas se queda con la última aunque la primera termine después', async () => {
    let releaseFirst: (value: { items: never[]; meta: typeof meta }) => void = () => undefined
    vi.mocked(fetchWalletPage).mockReturnValueOnce(new Promise((resolve) => (releaseFirst = resolve))).mockResolvedValueOnce({ items: [customer], meta })
    const { store, dispatch } = makeStore()
    const first = dispatch(loadWalletThunk())
    await dispatch(loadWalletThunk())
    releaseFirst({ items: [], meta })
    await first
    expect(store.getState().wallet.list.items).toHaveLength(1)
  })

  it('guarda los totales y las facturas del cliente', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(loadWalletSummaryThunk())
    await dispatch(loadInvoicesThunk(5))
    expect(fetchWalletSummary).toHaveBeenCalledWith(ctx, 4)
    expect(fetchCustomerInvoices).toHaveBeenCalledWith(ctx, 5, 4)
    expect(store.getState().wallet.summary.data).toEqual(summary)
    expect(store.getState().wallet.invoices.items).toHaveLength(2)
  })

  it('al recargar la lista refresca los saldos del cliente abierto', async () => {
    const { store, dispatch } = makeStore()
    store.dispatch(setSelectedCustomer({ ...customer, usedCredit: 999 }))
    await dispatch(loadWalletThunk())
    expect(store.getState().wallet.selectedCustomer?.usedCredit).toBe(800)
  })

  it('abrir otro cliente limpia las facturas del anterior; cerrar el panel limpia todo', async () => {
    const { store, dispatch } = makeStore()
    store.dispatch(setSelectedCustomer(customer))
    await dispatch(loadInvoicesThunk(5))
    store.dispatch(setSelectedCustomer({ ...customer, id: 6 }))
    expect(store.getState().wallet.invoices.items).toEqual([])
    store.dispatch(setAccountDrawerOpen(false))
    expect(store.getState().wallet.selectedCustomer).toBeNull()
  })
})

describe('abonos', () => {
  const withInvoices = async () => {
    const made = makeStore()
    made.store.dispatch(setSelectedCustomer(customer))
    await made.dispatch(loadInvoicesThunk(5))
    vi.clearAllMocks()
    vi.mocked(fetchWalletPage).mockResolvedValue({ items: [customer], meta })
    vi.mocked(fetchWalletSummary).mockResolvedValue(summary)
    vi.mocked(registerPayment).mockResolvedValue(undefined)
    vi.mocked(fetchCustomerInvoices).mockResolvedValue([invoice(2, '2026-10-01', 300)])
    return made
  }

  it('abonar a una factura registra un pago con lo que queda por pagar y relee todo', async () => {
    const { store, dispatch } = await withInvoices()
    await dispatch(payThunk({ customerId: 5, amount: 200, saleId: 1 }))
    expect(registerPayment).toHaveBeenCalledTimes(1)
    expect(registerPayment).toHaveBeenCalledWith(ctx, 5, { saleId: 1, amount: 200, remainingAmount: 300 }, 4)
    expect(fetchCustomerInvoices).toHaveBeenCalled()
    expect(fetchWalletPage).toHaveBeenCalled()
    expect(fetchWalletSummary).toHaveBeenCalled()
    expect(store.getState().wallet.invoices).toMatchObject({ saving: false, items: [{ saleId: 2 }] })
    expect(toast.success).toHaveBeenCalled()
  })

  it('un abono general se reparte entre las facturas más antiguas, un pago por factura', async () => {
    const { dispatch } = await withInvoices()
    await dispatch(payThunk({ customerId: 5, amount: 600 }))
    expect(registerPayment).toHaveBeenCalledTimes(2)
    expect(registerPayment).toHaveBeenNthCalledWith(1, ctx, 5, { saleId: 1, amount: 500, remainingAmount: 0 }, 4)
    expect(registerPayment).toHaveBeenNthCalledWith(2, ctx, 5, { saleId: 2, amount: 100, remainingAmount: 200 }, 4)
  })

  it('si un pago falla avisa, no sigue con los demás y aun así relee lo ya abonado', async () => {
    const { store, dispatch } = await withInvoices()
    vi.mocked(registerPayment).mockResolvedValueOnce(undefined).mockRejectedValueOnce({ userFriendlyMessage: 'Rechazado' })
    await dispatch(payThunk({ customerId: 5, amount: 800 }))
    expect(toast.error).toHaveBeenCalledWith('Rechazado')
    expect(fetchCustomerInvoices).toHaveBeenCalled()
    expect(store.getState().wallet.invoices.saving).toBe(false)
  })

  it('sin saldo pendiente avisa y no llama al backend', async () => {
    const { dispatch } = makeStore()
    await dispatch(payThunk({ customerId: 5, amount: 100 }))
    expect(registerPayment).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalled()
  })

  it('no acepta otro cambio mientras uno está en curso', async () => {
    const { store, dispatch } = await withInvoices()
    let release: () => void = () => undefined
    vi.mocked(registerPayment).mockReturnValue(new Promise<void>((resolve) => (release = resolve)))
    const first = dispatch(payThunk({ customerId: 5, amount: 100, saleId: 1 }))
    expect(store.getState().wallet.invoices.saving).toBe(true)
    await dispatch(payThunk({ customerId: 5, amount: 100, saleId: 1 })) // ignorado
    release()
    await first
    expect(registerPayment).toHaveBeenCalledTimes(1)
  })
})

describe('cupo y plazo', () => {
  it('guarda el cambio y vuelve a leer la lista y los totales', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(updateCreditThunk({ customerId: 5, quota: 5000, days: 45, isCredit: true }))
    expect(updateCredit).toHaveBeenCalledWith({ customerId: 5, quota: 5000, days: 45, isCredit: true })
    expect(fetchWalletPage).toHaveBeenCalled()
    expect(fetchWalletSummary).toHaveBeenCalled()
    expect(store.getState().wallet.invoices.saving).toBe(false)
  })

  it('si el backend falla avisa y no relee', async () => {
    vi.mocked(updateCredit).mockRejectedValue({ userFriendlyMessage: 'Sin permiso' })
    const { dispatch } = makeStore()
    await dispatch(updateCreditThunk({ customerId: 5, quota: 1, days: 1, isCredit: false }))
    expect(toast.error).toHaveBeenCalledWith('Sin permiso')
    expect(fetchWalletPage).not.toHaveBeenCalled()
  })

  it('cerrar sesión borra todo lo de cartera', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(loadWalletThunk())
    store.dispatch({ type: 'auth/logout/fulfilled' })
    expect(store.getState().wallet.list.items).toEqual([])
  })
})
