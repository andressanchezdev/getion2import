// CountDetailPanel · detalle de un conteo físico en el panel derecho: datos del conteo y cada renglón con lo esperado, lo contado y la diferencia
// conecta con: formRegistry (countDetail), InventoryCountsScreen (lo abre con el conteo y las acciones), ProductLine, Pill y navigation (closeDrawerForm); reemplaza a la ventana flotante que había
// ojo: las cantidades se editan solo mientras el conteo está pendiente; al verificar o corroborar el conteo cambia y la pantalla vuelve a abrir este panel con el dato nuevo
import React, { useState } from 'react'
import { closeDrawerForm } from '@/features/navigation'
import { Pill, type PillTone } from '@/global/components/UI/atoms/Pill'
import { ProductLine, ProductLineList } from '@/global/components/UI/molecules/product/ProductLine'
import { formatDate } from '@/global/helpers/formatting/format'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import type { InventoryCount, UpdateCountItemInput } from '../../types/inventory.counts.types'
import './CountDetailPanel.css'

export interface CountDetailPayload {
  count: InventoryCount
  onSaveItems: (countId: number, items: UpdateCountItemInput[]) => Promise<void>
  onVerify: (countId: number) => Promise<void>
  onCorroborate: (countId: number) => Promise<void>
}

const STATUS_TONES: Record<string, PillTone> = { pending: 'amber', verified: 'blue', corroborated: 'green' }
const STATUS_LABELS: Record<string, string> = { pending: 'Pendiente', verified: 'Verificado', corroborated: 'Corroborado' }

const initialQuantities = (count: InventoryCount): Record<number, number> => {
  const initial: Record<number, number> = {}
  for (const item of count.items ?? []) {
    if (item.countedQty != null) initial[item.stockId] = item.countedQty
  }
  return initial
}

export const CountDetailPanel: React.FC<{ payload: CountDetailPayload }> = ({ payload }) => {
  const dispatch = useAppDispatch()
  const { can } = usePermissions()
  const canCount = can('stock:count') // PUT /counts/:id/items
  const canVerify = can('stock:count_verify') // verificar y corroborar
  const { count, onSaveItems, onVerify, onCorroborate } = payload
  const [quantities, setQuantities] = useState<Record<number, number>>(() => initialQuantities(count))
  const [saving, setSaving] = useState(false)
  const isPending = count.status === 'pending'
  const isVerified = count.status === 'verified'

  const changeQuantity = (stockId: number, value: string) => {
    const number = parseInt(value, 10)
    setQuantities((current) => ({ ...current, [stockId]: Number.isNaN(number) ? 0 : Math.max(0, number) }))
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSaveItems(count.id, Object.entries(quantities).map(([stockId, countedQty]) => ({ stockId: Number(stockId), countedQty })))
    } finally {
      setSaving(false)
    }
  }

  const facts: Array<[string, string]> = [
    ['Bodega', count.warehouseName],
    ['Responsable', count.employeeName || 'No asignado'],
    ['Fecha de inicio', formatDate(count.createdAt)],
    ...(count.notes ? ([['Notas', count.notes]] as Array<[string, string]>) : []),
  ]

  return (
    <div className="drawer-form">
      <div className="drawer-form-body">
        <p className="drawer-form-note">
          Conteo físico #{count.id} <Pill tone={STATUS_TONES[count.status] || 'gray'}>{STATUS_LABELS[count.status] || count.status}</Pill>
        </p>
        <dl className="count-panel-facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        {(!count.items || count.items.length === 0) && <p className="drawer-form-note">No se encontraron artículos en este conteo.</p>}
        <ProductLineList>
          {(count.items ?? []).map((item) => {
            const counted = quantities[item.stockId] ?? item.countedQty ?? null
            const diff = counted !== null ? counted - item.expectedQty : null
            return (
              <ProductLine
                key={item.id}
                name={item.productName}
                code={item.productCode}
                quantity={item.expectedQty}
                note={`${item.location || 'Principal'} · esperado ${item.expectedQty}${diff !== null ? ` · diferencia ${diff > 0 ? `+${diff}` : diff}` : ''}`}
                trailing={
                  isPending ? (
                    <input type="number" min={0} className="drawer-form-control" style={{ width: '5rem' }} value={counted !== null ? counted : ''} placeholder="0" onChange={(event) => changeQuantity(item.stockId, event.target.value)} aria-label={`Cantidad contada de ${item.productName}`} />
                  ) : (
                    <strong>{item.countedQty ?? '—'}</strong>
                  )
                }
              />
            )
          })}
        </ProductLineList>
      </div>

      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>Cerrar</button>
        {isPending && (
          <>
            {canCount && <button type="button" className="btn-secondary" disabled={saving} onClick={save}>{saving ? 'Guardando…' : 'Guardar cantidades'}</button>}
            {canVerify && <button type="button" className="btn-primary" disabled={saving} onClick={() => onVerify(count.id)}>Verificar conteo</button>}
          </>
        )}
        {isVerified && canVerify && <button type="button" className="btn-primary" onClick={() => onCorroborate(count.id)}>Corroborar y ajustar stock</button>}
      </div>
    </div>
  )
}

export default CountDetailPanel
