// useCashCollect · formulario del cobro mixto de un pedido en Caja: líneas de pago (efectivo, transferencia, crédito), lo que falta por cubrir, validación y envío
// conecta con: CashCollectPanel (lo usa), cash.collect (reglas), cash.thunks (collectPaymentsThunk y loadCashSessionThunk), useCashSession (turno abierto), orders (refresca la tabla), navigation (cierra el panel) y toast
// ojo: el panel se cierra solo si el cobro salió bien; el envío se frena con una marca síncrona para que dos clics seguidos no cobren dos veces
import { useRef, useState } from 'react'
import { closeDrawerForm } from '@/features/navigation'
import { loadOrderCountsThunk, loadOrdersThunk, type OrderRow } from '@/features/orders'
import { formatCOP } from '@/global/helpers/formatting/format'
import { toast } from '@/global/helpers/feedback/toast'
import { optimizeImageFile } from '@/global/helpers/images/imageOptimizer'
import { isRealtimeLive } from '@/features/realtime/helpers/realtime.guards'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { collectProblem, emptyLine, lineProblem, remainingOf, sumLines, toCollectInput } from '../helpers/cash.collect'
import { collectPaymentsThunk, loadCashSessionThunk } from '../thunks/cash.thunks'
import type { CollectLine } from '../types/cash.types'
import { useCashSession } from './useCashSession'

export interface CashCollectPayload {
  order: OrderRow
}

export const useCashCollect = (order: OrderRow) => {
  const dispatch = useAppDispatch()
  const cash = useCashSession()
  const live = useAppSelector(isRealtimeLive)
  const remaining = remainingOf(order)
  const [lines, setLines] = useState<CollectLine[]>(() => [emptyLine(remaining)])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const lock = useRef(false)

  const covered = sumLines(lines)
  const problem = collectProblem(lines, remaining, cash.isOpen)

  const addLine = () => setLines((prev) => [...prev, emptyLine(Math.max(remaining - sumLines(prev), 0))])
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index))
  const changeLine = (index: number, patch: Partial<CollectLine>) => setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))

  const attachProof = async (index: number, file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Adjunta una captura o foto válida (JPG o PNG).')
      return
    }
    try {
      const optimized = await optimizeImageFile(file, { maxWidth: 1000, maxHeight: 1000, quality: 0.8 })
      changeLine(index, { proofUrl: optimized.dataUrl, fileName: file.name })
    } catch {
      toast.error('No se pudo leer la imagen.')
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (problem || lock.current) return
    lock.current = true
    setSaving(true)
    setError(null)
    const result = await dispatch(collectPaymentsThunk(toCollectInput(order.id, lines)))
    lock.current = false
    setSaving(false)
    if (!collectPaymentsThunk.fulfilled.match(result)) return setError(result.payload ?? 'No se pudo registrar el cobro.')

    const confirmed = result.payload.stage === 'verification_ok'
    toast.success(`Cobro de ${formatCOP(covered)} registrado`, {
      description: confirmed ? `Pedido ${order.serial}: verificación confirmada, pasa a la cola de alistamiento.` : `Pedido ${order.serial}: quedan ${formatCOP(result.payload.balance)} por cubrir o por verificar.`,
    })
    // en vivo, el pedido y los totales del turno llegan por evento (sale.stage_changed, sale.payment_changed, cash_session.totals_changed); sin socket se vuelven a leer
    if (!live) {
      dispatch(loadOrdersThunk())
      dispatch(loadOrderCountsThunk())
      if (cash.warehouseId > 0) dispatch(loadCashSessionThunk(cash.warehouseId))
    }
    dispatch(closeDrawerForm())
  }

  return {
    order,
    remaining,
    lines,
    covered,
    left: Math.max(remaining - covered, 0),
    shiftOpen: cash.isOpen,
    lineProblems: lines.map((line) => lineProblem(line, cash.isOpen)),
    problem,
    saving,
    error,
    addLine,
    removeLine,
    changeLine,
    attachProof,
    submit,
    cancel: () => dispatch(closeDrawerForm()),
  }
}
