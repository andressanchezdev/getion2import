// useCashClose · estado y guardado del arqueo y cierre del turno: efectivo contado, gastos de caja, notas y el cálculo en vivo de lo esperado y la diferencia
// conecta con: CashClosePanel (lo usa), cash.helpers (computeClosing y cleanExpenses), cash.thunks (closeCashSessionThunk), cash.selectors y navigation (cierra el panel)
// ojo: el efectivo contado es obligatorio; una fila de gasto vacía se ignora, pero una a medias (sin concepto o sin monto) frena el cierre y se avisa
import { useMemo, useState } from 'react'
import { closeDrawerForm } from '@/features/navigation'
import { toast } from '@/global/helpers/feedback/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { cleanExpenses, computeClosing, isExpenseFilled } from '../helpers/cash.helpers'
import { selectCash } from '../selectors/cash.selectors'
import { closeCashSessionThunk } from '../thunks/cash.thunks'
import type { CashExpense } from '../types/cash.types'

const EMPTY_EXPENSE: CashExpense = { receiptNumber: '', concept: '', cashAmount: 0, transferAmount: 0 }
const isBlank = (expense: CashExpense) => expense.concept.trim() === '' && expense.receiptNumber.trim() === '' && expense.cashAmount === 0 && expense.transferAmount === 0

export const useCashClose = () => {
  const dispatch = useAppDispatch()
  const { session, saving } = useAppSelector(selectCash)
  const [counted, setCounted] = useState('')
  const [notes, setNotes] = useState('')
  const [expenses, setExpenses] = useState<CashExpense[]>([])
  const [error, setError] = useState<string | null>(null)

  const closing = useMemo(() => (session ? computeClosing(session, expenses, Number(counted) || 0) : null), [session, expenses, counted])
  const hasCounted = counted !== ''
  const half = expenses.some((expense) => !isBlank(expense) && !isExpenseFilled(expense))

  const addExpense = () => setExpenses((prev) => [...prev, EMPTY_EXPENSE])
  const removeExpense = (index: number) => setExpenses((prev) => prev.filter((_, i) => i !== index))
  const changeExpense = (index: number, patch: Partial<CashExpense>) => setExpenses((prev) => prev.map((expense, i) => (i === index ? { ...expense, ...patch } : expense)))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!session || !hasCounted || saving) return
    if (half) {
      setError('Hay gastos a medias: cada uno necesita concepto y algún monto, o quítalo.')
      return
    }
    setError(null)
    const result = await dispatch(closeCashSessionThunk({ warehouseId: session.warehouseId, countedCash: Number(counted), notes: notes.trim() || undefined, expenses: cleanExpenses(expenses) }))
    if (closeCashSessionThunk.fulfilled.match(result)) {
      toast.success('Turno de caja cerrado', { description: 'El arqueo quedó guardado.' })
      dispatch(closeDrawerForm())
    } else {
      setError(result.payload ?? 'No se pudo cerrar el turno de caja.')
    }
  }

  return { session, closing, counted, setCounted, notes, setNotes, expenses, addExpense, removeExpense, changeExpense, hasCounted, saving, error, submit, cancel: () => dispatch(closeDrawerForm()) }
}
