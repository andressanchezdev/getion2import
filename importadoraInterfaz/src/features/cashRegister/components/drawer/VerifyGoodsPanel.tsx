// VerifyGoodsPanel · cotejo físico de mercancía en el panel derecho: cada renglón de la factura con su casilla; solo se autoriza la salida con todos marcados
// conecta con: formRegistry (verifyGoods), CashOrdersPanel (lo abre), useSaleLines (renglones del pedido), useProductImages y ProductLine; reemplaza a la ventana flotante que había
// ojo: el marcado es local al panel; al autorizar se avisa a quien lo abrió (onVerified) y el panel se cierra
import React, { useState } from 'react'
import { closeDrawerForm } from '@/features/navigation'
import { useProductImages } from '@/features/shop'
import { ProductLine, ProductLineList } from '@/global/components/UI/molecules/product/ProductLine'
import { notify } from '@/global/helpers/feedback/toast'
import { formatCurrency } from '@/global/helpers/formatting/format'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { useSaleLines } from '../../hooks/useSaleLines'

export interface VerifyGoodsPayload {
  orderId: number
  serial: string
  customerName: string
  total: number
  isImmediate?: boolean
  onVerified: () => void
}

export const VerifyGoodsPanel: React.FC<{ payload: VerifyGoodsPayload }> = ({ payload }) => {
  const dispatch = useAppDispatch()
  const { lines, loading } = useSaleLines(payload.orderId)
  const images = useProductImages(lines.map((line) => line.productId))
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const toggle = (lineId: number) => setChecked((current) => ({ ...current, [lineId]: !current[lineId] }))
  const done = Object.values(checked).filter(Boolean).length
  const allChecked = lines.length > 0 && lines.every((line) => checked[line.id])

  const confirm = () => {
    if (!allChecked) return notify.error('Debes marcar y verificar todos los productos de la factura antes de dar salida.')
    notify.success(`Mercancía de la orden ${payload.serial} verificada contra la factura. Salida autorizada.`)
    payload.onVerified()
    dispatch(closeDrawerForm())
  }

  return (
    <div className="drawer-form">
      <div className="drawer-form-body">
        <p className="drawer-form-note">
          Orden <strong>{payload.serial}</strong> · Cliente <strong>{payload.customerName}</strong>{payload.isImmediate ? ' · Picking inmediato' : ''}. Revisa físicamente cada repuesto antes de que el cliente salga y marca cada casilla al confirmar SKU y cantidad.
        </p>

        {loading && <p className="drawer-form-note">Cargando productos de la factura…</p>}
        {!loading && lines.length === 0 && <p className="drawer-form-note">No se encontraron líneas de producto para esta orden.</p>}

        <ProductLineList>
          {lines.map((line) => (
            <ProductLine
              key={line.id}
              name={line.productName}
              code={line.productCode}
              imageUrl={images[line.productId]}
              quantity={line.quantity}
              unitPrice={line.unitPrice}
              total={line.lineTotal}
              trailing={<input type="checkbox" className="drawer-form-check" checked={Boolean(checked[line.id])} onChange={() => toggle(line.id)} aria-label={`Verificar ${line.productName}`} />}
            />
          ))}
        </ProductLineList>

        <p className="drawer-form-note">
          Total facturado: <strong>{formatCurrency(payload.total)}</strong> · Verificados: <strong>{done} / {lines.length}</strong>
        </p>
      </div>

      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>Cancelar</button>
        <button type="button" className="btn-primary" disabled={!allChecked} onClick={confirm}>
          {allChecked ? 'Autorizar salida de mercancía' : 'Pendiente cotejo completo'}
        </button>
      </div>
    </div>
  )
}

export default VerifyGoodsPanel
