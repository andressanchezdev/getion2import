// RegisterExpenseDrawer · panel derecho para registrar gastos operativos desde la Tienda / Caja
import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { closeDrawerForm } from '@/features/navigation'
import { toast } from '@/global/helpers/feedback/toast'
import { MoneyInput } from '@/global/components/UI/molecules/form'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './RegisterExpenseDrawer.css'
import { EXPENSE_TYPES } from '../../constants/shop.expense.constants'

export const RegisterExpenseDrawer: React.FC = () => {
  const dispatch = useAppDispatch()
  const activeWarehouseName = useAppSelector((state) => state.ui.activeWarehouseName)

  const [expenseType, setExpenseType] = useState('merchandise_arrival')
  const [concept, setConcept] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return

    const numAmount = Number(amount)
    if (!concept.trim()) {
      toast.error('El concepto o descripción del gasto es obligatorio.')
      return
    }

    if (!numAmount || numAmount <= 0) {
      toast.error('Debes ingresar un monto válido mayor a cero.')
      return
    }

    setSaving(true)
    try {
      // Simulación de guardado con timeout de seguridad
      await new Promise((resolve) => setTimeout(resolve, 600))
      toast.success(`Gasto de $${numAmount.toLocaleString('es-CO')} registrado exitosamente.`)
      dispatch(closeDrawerForm())
    } catch {
      toast.error('No se pudo registrar el gasto.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="drawer-form register-expense-drawer" onSubmit={handleSubmit}>
      <div className="drawer-form-body">
        <section className="drawer-form-section expense-context-box">
          <span>Bodega operativa: <strong>{activeWarehouseName || 'Sede Principal'}</strong></span>
        </section>

        <div className="drawer-form-field">
          <label className="drawer-form-label" htmlFor="expense-type">
            Tipo de Gasto *
          </label>
          <select
            id="expense-type"
            className="drawer-form-control"
            value={expenseType}
            onChange={(e) => setExpenseType(e.target.value)}
            disabled={saving}
            required
          >
            {EXPENSE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="drawer-form-field">
          <label className="drawer-form-label" htmlFor="expense-concept">
            Concepto o Beneficiario *
          </label>
          <input
            id="expense-concept"
            type="text"
            className="drawer-form-control"
            placeholder="Ej. Pago flete repuestos de Medellín"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            disabled={saving}
            required
          />
        </div>

        <div className="drawer-form-row">
          <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor="expense-receipt">
              Nº Comprobante / Recibo
            </label>
            <input
              id="expense-receipt"
              type="text"
              className="drawer-form-control"
              placeholder="Fac / Rec # 1234"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor="expense-method">
              Medio de Pago *
            </label>
            <select
              id="expense-method"
              className="drawer-form-control"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'transfer')}
              disabled={saving}
            >
              <option value="cash">Efectivo de caja</option>
              <option value="transfer">Transferencia bancaria</option>
            </select>
          </div>
        </div>

        <div className="drawer-form-field">
          <label className="drawer-form-label" htmlFor="expense-amount">
            Monto del Gasto (COP) *
          </label>
          <MoneyInput
            id="expense-amount"
            className="drawer-form-control"
            value={amount}
            onValueChange={setAmount}
            placeholder="Ej. 150.000"
            disabled={saving}
            required
          />
        </div>

        <div className="drawer-form-field">
          <label className="drawer-form-label" htmlFor="expense-notes">
            Observaciones o Detalles
          </label>
          <textarea
            id="expense-notes"
            className="drawer-form-control"
            rows={3}
            placeholder="Detalles adicionales del pago o soporte..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>

      <div className="drawer-form-footer">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => dispatch(closeDrawerForm())}
          disabled={saving}
        >
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving || !amount || Number(amount) <= 0}>
          {saving ? 'Registrando…' : 'Registrar Gasto'}
        </button>
      </div>
    </form>
  )
}

export default RegisterExpenseDrawer

