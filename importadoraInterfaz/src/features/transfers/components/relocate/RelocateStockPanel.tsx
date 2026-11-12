// RelocateStockPanel · panel lateral para reubicar un producto dentro de su bodega
// conecta con: inventory (relocateStockThunk), formRegistry, WarehouseProductsTable y ProductsTable
import React, { useState } from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './RelocateStockPanel.css'
import { closeDrawerForm } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { relocateStockThunk } from '@/features/inventory'
import { toast } from '@/global/helpers/feedback/toast'
import { useLocations } from '@/features/locations'

export interface RelocateStockPayload {
  stockId: number
  productId?: number
  productCode: string
  productName: string
  warehouseId?: number // con la bodega, la nueva ubicación se elige de las que existen en ella
  currentLocation?: string
  availableQuantity: number
  onSuccess?: () => void
}

interface RelocateStockPanelProps {
  payload: RelocateStockPayload
}

export const RelocateStockPanel: React.FC<RelocateStockPanelProps> = ({ payload }) => {
  const dispatch = useAppDispatch()
  const locations = useLocations(payload.warehouseId)
  const options = locations.items.filter((item) => item.isActive && item.code !== payload.currentLocation)

  const [destinationLocation, setDestinationLocation] = useState('')
  const [quantity, setQuantity] = useState(String(payload.availableQuantity || 1))
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!destinationLocation.trim()) {
      setErrorMsg('Debes ingresar la nueva ubicación (estante / pasillo).')
      return
    }

    const qtyNum = parseInt(quantity, 10)
    if (isNaN(qtyNum) || qtyNum <= 0 || qtyNum > payload.availableQuantity) {
      setErrorMsg(`La cantidad debe ser entre 1 y ${payload.availableQuantity} unidades.`)
      return
    }

    setSaving(true)
    setErrorMsg(null)

    try {
      await dispatch(
        relocateStockThunk({
          originStockId: payload.stockId,
          destinationLocation: destinationLocation.trim(),
          quantity: qtyNum,
          reason: reason.trim() || undefined,
        })
      ).unwrap()

      toast.success('Producto reubicado correctamente en la bodega')
      if (payload.onSuccess) payload.onSuccess()
      dispatch(closeDrawerForm())
    } catch (message) {
      setErrorMsg(typeof message === 'string' ? message : 'Error al reubicar el producto.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="drawer-form relocate-panel" onSubmit={handleSubmit}>
      <div className="drawer-form-body relocate-body">
        {errorMsg && <div className="form-field-error-msg">{errorMsg}</div>}

        <div className="relocate-product-summary">
          <span className="relocate-code">{payload.productCode}</span>
          <h4 className="relocate-name">{payload.productName}</h4>
          <div className="relocate-stats">
            <div>
              <span className="stat-label">Ubicación actual:</span>
              <span className="stat-value">{payload.currentLocation || 'Sin estante asignado'}</span>
            </div>
            <div>
              <span className="stat-label">Disponible a mover:</span>
              <span className="stat-value highlight">{payload.availableQuantity} unidades</span>
            </div>
          </div>
        </div>

        <div className="drawer-form-field relocate-field">
          <label htmlFor="relocate-dest" className="drawer-form-label">Nueva ubicación (Estantería / Pasillo)</label>
          {payload.warehouseId ? (
            <select id="relocate-dest" className="drawer-form-control relocate-input" value={destinationLocation} onChange={(e) => setDestinationLocation(e.target.value)} disabled={saving} required autoFocus>
              <option value="">Elige la ubicación…</option>
              {options.map((item) => (
                <option key={item.id} value={item.code}>
                  {item.code}
                  {item.description ? ` · ${item.description}` : ''}
                </option>
              ))}
            </select>
          ) : (
            <input id="relocate-dest" type="text" className="drawer-form-control relocate-input" placeholder="Ej: ESTANTE-A-02" value={destinationLocation} onChange={(e) => setDestinationLocation(e.target.value)} disabled={saving} required autoFocus />
          )}
          <span className="drawer-form-hint relocate-hint">Debe ser una ubicación que exista en esta misma bodega (se crean en Inventario → Ubicaciones).</span>
        </div>

        <div className="drawer-form-field relocate-field">
          <label htmlFor="relocate-qty" className="drawer-form-label">Cantidad a reubicar</label>
          <input
            id="relocate-qty"
            type="number"
            className="drawer-form-control relocate-input"
            min={1}
            max={payload.availableQuantity}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={saving}
            required
          />
        </div>

        <div className="drawer-form-field relocate-field">
          <label htmlFor="relocate-reason" className="drawer-form-label">Motivo u observación (opcional)</label>
          <textarea
            id="relocate-reason"
            className="drawer-form-control relocate-textarea"
            rows={3}
            placeholder="Ej: Optimización de espacio, reordenamiento..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>

      <div className="drawer-form-footer relocate-footer">
        <button
          type="button"
          className="btn-secondary"
          disabled={saving}
          onClick={() => dispatch(closeDrawerForm())}
        >
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Reubicando…' : 'Confirmar Reubicación'}
        </button>
      </div>
    </form>
  )
}

export default RelocateStockPanel

