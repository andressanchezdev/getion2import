// CashOpenPanel · panel lateral para abrir el turno de caja de la bodega activa con su fondo inicial de cambio
// conecta con: useCashOpen (estado y guardado), MoneyInput y DrawerFormShell.css (armazón); lo abre formRegistry («cashOpen»)
// ojo: el fondo es obligatorio; es el efectivo con el que arranca la gaveta y entra en el cálculo del cierre
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import { MoneyInput } from '@/global/components/UI/molecules/form'
import { useCashOpen } from '../../hooks/useCashOpen'

export const CashOpenPanel: React.FC = () => {
  const form = useCashOpen()

  return (
    <form className="drawer-form" onSubmit={form.submit}>
      <div className="drawer-form-body">
        <p className="drawer-form-note">
          Bodega: <strong>{form.warehouseName || 'sin elegir'}</strong>. Mientras el turno esté abierto, los cobros de esta bodega quedan ligados a él.
        </p>
        {form.error && <div className="form-field-error-msg">{form.error}</div>}
        <div className="drawer-form-field">
          <label className="drawer-form-label" htmlFor="cash-opening">Fondo inicial de cambio *</label>
          <MoneyInput id="cash-opening" className="drawer-form-control" value={form.amount} onValueChange={form.setAmount} placeholder="Ej: 50.000" disabled={form.saving} required />
          <span className="drawer-form-hint">El efectivo con el que arranca la gaveta. Se descuenta al hacer el arqueo del cierre.</span>
        </div>
      </div>
      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" disabled={form.saving} onClick={form.cancel}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={!form.valid || form.saving}>
          {form.saving ? 'Abriendo…' : 'Abrir turno'}
        </button>
      </div>
    </form>
  )
}

export default CashOpenPanel
