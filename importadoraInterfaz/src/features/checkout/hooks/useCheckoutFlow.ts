// useCheckoutFlow · estado del flujo de finalizar compra o cotizar: renglones, cliente elegido, datos de entrega, empleado (si lo confirma un administrador), picking inmediato, forma de pago y confirmación
// conecta con: CheckoutPanel (lo usa), checkout.thunks (buscar, cargar, confirmar), checkout.adapter (cálculos), navigation (cerrar y abrir el detalle), usePermissions (nivel) y global toast
// ojo: con la caja de la bodega cerrada el pago en efectivo se bloquea (cashBlocked)
// ojo: es el borrador del formulario (estado local); los datos del cliente y la creación de la venta pasan por thunks. El administrador debe elegir el empleado al que le entrega la venta
import { useEffect, useMemo, useState } from 'react'
import { useCashSession } from '@/features/cashRegister'
import { closeDrawerForm, openDrawerForm } from '@/features/navigation'
import { toast } from '@/global/helpers/feedback/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { useDebouncedValue } from '@/global/hooks/data/useDebouncedValue'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { toWarehouseNumber } from '@/features/shop'
import { checkoutBlockers, deliveryProblems, generalBlockers, type BlockerInput } from '../helpers/checkout.blockers'
import { canPayByCredit, checkCreditUsageAlert, computeTotals, initialDelivery, isDeliveryValid } from '../helpers/checkout.adapter'
import { confirmQuotationThunk, confirmSaleThunk, loadCheckoutCustomerThunk, loadCheckoutLinesThunk, searchCheckoutCustomersThunk } from '../thunks/checkout.thunks'
import type { CheckoutCustomer, CheckoutLine, CheckoutPayload, DeliveryData, PaymentChoice } from '../types/checkout.types'

const EMPTY_DELIVERY: DeliveryData = { address: '', city: '', phone: '', notes: '' }

export const useCheckoutFlow = (payload: CheckoutPayload) => {
  const dispatch = useAppDispatch()
  const { level } = usePermissions()
  const isQuotation = payload.mode === 'quotation'
  const needsEmployee = !isQuotation && (level === 'admin' || level === 'superadmin')
  const cash = useCashSession()

  const [step, setStep] = useState<'customer' | 'payment'>('customer')
  const [lines, setLines] = useState<CheckoutLine[] | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CheckoutCustomer[]>([])
  const [customer, setCustomer] = useState<CheckoutCustomer | null>(null)
  const [delivery, setDelivery] = useState<DeliveryData>(EMPTY_DELIVERY)
  const [employeeId, setEmployeeId] = useState(0)
  const [attempted, setAttempted] = useState(false) // se intentó continuar con algo pendiente: desde ahí los campos incompletos se marcan
  const [payment, setPayment] = useState<PaymentChoice>('cash')
  const [transferProof, setTransferProof] = useState('')
  const [transferReference, setTransferReference] = useState('')
  const [transferBank, setTransferBank] = useState('')
  const [immediatePicking, setImmediatePicking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debouncedQuery = useDebouncedValue(query, 300)

  // Carga automática del cliente cuando se viene de una cotización o se envía en el payload
  useEffect(() => {
    if (!payload.customerId) return
    let cancelled = false
    dispatch(loadCheckoutCustomerThunk(payload.customerId)).then((result) => {
      if (cancelled) return
      if (!loadCheckoutCustomerThunk.fulfilled.match(result)) return setError(result.payload ?? 'No se pudo cargar el cliente.')
      setCustomer(result.payload)
      setDelivery(initialDelivery(result.payload))
    })
    return () => {
      cancelled = true
    }
  }, [dispatch, payload.customerId])

  useEffect(() => {
    let cancelled = false
    dispatch(loadCheckoutLinesThunk(payload)).then((result) => {
      if (cancelled) return
      if (loadCheckoutLinesThunk.fulfilled.match(result)) setLines(result.payload)
      else setError(result.payload ?? 'No se pudo preparar la compra.')
    })
    return () => {
      cancelled = true
    }
  }, [dispatch, payload])

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) return
    let cancelled = false
    dispatch(searchCheckoutCustomersThunk(debouncedQuery)).then((result) => {
      if (!cancelled && searchCheckoutCustomersThunk.fulfilled.match(result)) setResults(result.payload)
    })
    return () => {
      cancelled = true
    }
  }, [dispatch, debouncedQuery])

  const chooseCustomer = async (id: number) => {
    setError(null)
    const result = await dispatch(loadCheckoutCustomerThunk(id))
    if (!loadCheckoutCustomerThunk.fulfilled.match(result)) return setError(result.payload ?? 'No se pudo cargar el cliente.')
    setCustomer(result.payload)
    setDelivery(initialDelivery(result.payload)) // se cargan los datos guardados; se pueden editar
    setPayment('cash')
    const alertInfo = checkCreditUsageAlert(result.payload)
    if (alertInfo?.shouldAlert) {
      toast.warning(alertInfo.message)
    }
  }

  const clearCustomer = () => {
    setCustomer(null)
    setQuery('')
    setResults([])
  }

  const totals = useMemo(() => computeTotals(lines ?? [], customer?.discountPercent ?? 0), [lines, customer])
  const total = totals.subtotal
  const payable = totals.total // con descuento e IVA: es lo que se cobra y contra lo que se mide el cupo de crédito
  const creditAllowed = customer ? canPayByCredit(customer, payable) : false
  const deliveryOk = isQuotation || isDeliveryValid(delivery)
  const transferOk = payment !== 'transfer' || Boolean(transferProof.trim())
  // con la caja de la bodega cerrada no se emite un pedido pagado en efectivo (hay que abrir el turno antes); si no se pudo consultar la caja no se bloquea
  const cashBlocked = !isQuotation && payment === 'cash' && cash.warehouseId > 0 && !cash.loading && !cash.failed && !cash.isOpen
  const activeWarehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
  const warehouseNumber = toWarehouseNumber(activeWarehouseId)

  // lo que falta para continuar: cada dato de entrega se explica dentro de su campo y lo demás en una línea junto al botón
  const blockerInput: BlockerInput = {
    hasCustomer: Boolean(customer),
    linesCount: lines ? lines.length : null,
    delivery,
    deliveryRequired: !isQuotation,
    needsEmployee,
    employeeId,
    onPayment: step === 'payment',
    transferMissingProof: !transferOk,
    cashBlocked,
    warehouseMissing: !isQuotation && !warehouseNumber,
    isSuperadmin: level === 'superadmin',
  }
  const blockers = checkoutBlockers(blockerInput)
  const general = generalBlockers(blockerInput)
  const problems = deliveryProblems(delivery)
  const canContinue = blockers.length === 0 && deliveryOk && !cashBlocked

  // Notifica al usuario en caso de presionar o consultar por qué está bloqueado el flujo
  const notifyBlockers = () => {
    setAttempted(true)
    if (blockers.length > 0) {
      toast.warning('No se puede continuar con el pedido', {
        description: blockers[0],
      })
    }
  }

  const confirm = async () => {
    if (!customer || !lines || cashBlocked) return
    if (payment === 'transfer' && !transferProof.trim()) {
      setError('Debes adjuntar el comprobante de transferencia para continuar.')
      return
    }
    setSubmitting(true)
    setError(null)
    if (isQuotation) {
      const result = await dispatch(confirmQuotationThunk({ customer, lines }))
      setSubmitting(false)
      if (!confirmQuotationThunk.fulfilled.match(result)) return setError(result.payload ?? 'No se pudo crear la cotización.')
      toast.success('Cotización creada', { description: 'La encuentras en Tienda > Cotizaciones.' })
      dispatch(openDrawerForm({ kind: 'quotationDetail', payload: result.payload }))
      return
    }
    const result = await dispatch(confirmSaleThunk({
      payload,
      customer,
      lines,
      delivery,
      payment,
      salespersonEmployeeId: needsEmployee ? employeeId : undefined,
      immediatePicking,
      proofUrl: payment === 'transfer' ? transferProof : undefined,
      paymentReference: payment === 'transfer' ? (transferReference.trim() || undefined) : undefined,
    }))
    setSubmitting(false)
    if (!confirmSaleThunk.fulfilled.match(result)) return setError(result.payload ?? 'No se pudo crear el pedido.')
    toast.success('Pedido creado', { description: `Consecutivo ${result.payload.serialCode}` })
    dispatch(closeDrawerForm())
  }

  const changePayment = (choice: PaymentChoice) => {
    setPayment(choice)
    if (choice === 'credit') {
      const alertInfo = checkCreditUsageAlert(customer)
      if (alertInfo?.shouldAlert) {
        toast.warning(alertInfo.message)
      }
    }
  }

  return {
    isQuotation, needsEmployee, step, setStep, lines, query, setQuery, results, customer, chooseCustomer, clearCustomer,
    delivery, setDelivery, employeeId, setEmployeeId, payment, setPayment: changePayment,
    transferProof, setTransferProof, transferReference, setTransferReference, transferBank, setTransferBank,
    immediatePicking, setImmediatePicking,
    total, totals, payable, creditAllowed, canContinue, blockers, generalBlockers: general, problems, attempted, cashBlocked, cashWarehouseName: cash.warehouseName, submitting, error, confirm, notifyBlockers,
  }
}
