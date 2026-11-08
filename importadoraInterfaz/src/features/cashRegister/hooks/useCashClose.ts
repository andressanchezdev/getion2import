// useCashClose · estado y guardado del cierre del turno: monto en efectivo, transferencias y abonos declarados, gastos de caja, notas y el cálculo en vivo de lo esperado y las diferencias
// conecta con: CashClosePanel (lo usa), cash.helpers (computeClosing y cleanExpenses), cash.thunks (closeCashSessionThunk), cash.selectors y navigation (cierra el panel)
// ojo: el efectivo es obligatorio; las transferencias lo son si el turno recibió alguna y los abonos si hubo abonos (si no, no se piden); una fila de gasto vacía se ignora, pero una a medias (sin concepto o sin monto) frena el cierre y se avisa
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
  const [countedTransfer, setCountedTransfer] = useState('')
  const [countedAbonos, setCountedAbonos] = useState('')
  const [notes, setNotes] = useState('')
  const [expenses, setExpenses] = useState<CashExpense[]>([])
  const [error, setError] = useState<string | null>(null)

  const closing = useMemo(() => (session ? computeClosing(session, expenses, { cash: Number(counted) || 0, transfer: Number(countedTransfer) || 0, abonos: Number(countedAbonos) || 0 }) : null), [session, expenses, counted, countedTransfer, countedAbonos])
  const needsTransfer = (session?.transferTotal ?? 0) > 0
  const needsAbonos = (session?.abonosTotal ?? 0) > 0
  // se puede cerrar cuando está declarado todo lo que el turno recibió
  const hasCounted = counted !== '' && (!needsTransfer || countedTransfer !== '') && (!needsAbonos || countedAbonos !== '')
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
    const result = await dispatch(closeCashSessionThunk({ warehouseId: session.warehouseId, countedCash: Number(counted), countedTransfer: countedTransfer === '' ? undefined : Number(countedTransfer), countedAbonos: countedAbonos === '' ? undefined : Number(countedAbonos), notes: notes.trim() || undefined, expenses: cleanExpenses(expenses) }))
    if (closeCashSessionThunk.fulfilled.match(result)) {
      toast.success('Turno de caja cerrado', { description: 'El cierre quedó guardado.' })
      dispatch(closeDrawerForm())
    } else {
      setError(result.payload ?? 'No se pudo cerrar el turno de caja.')
    }
  }

  return { session, closing, counted, setCounted, countedTransfer, setCountedTransfer, countedAbonos, setCountedAbonos, needsTransfer, needsAbonos, notes, setNotes, expenses, addExpense, removeExpense, changeExpense, hasCounted, saving, error, submit, cancel: () => dispatch(closeDrawerForm()) }
}
