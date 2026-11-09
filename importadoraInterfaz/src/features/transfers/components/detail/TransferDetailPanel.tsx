// TransferDetailPanel · detalle de un traslado en el panel derecho: datos y trazabilidad de empleados, ruta, repuestos y notas; mismo diseño que el detalle de cotizaciones y de empleados
// conecta con: formRegistry (lo muestra), transfers.constants (texto del estado), format (fecha), useTransferDetail (trae el detalle si falta) y navigation (cerrar el panel)
// ojo: el panel recibe el traslado ya cargado desde la tabla y si viene sin ítems consulta el endpoint por ID; los íconos y emojis no se usan, solo texto y los tokens de la línea
import React from 'react'
import './TransferDetailPanel.css'
import { closeDrawerForm } from '@/features/navigation'
import { formatDateTime } from '@/global/helpers/formatting/format'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { ProductLine, ProductLineList } from '@/global/components/UI/molecules/product/ProductLine'
import { useProductImages } from '@/features/shop'
import { TRANSFER_STATUS_BADGE } from '../../constants/transfers.constants'
import { useTransferDetail } from '../../hooks/useTransferDetail'
import type { TrasladeItem } from '../../types/transfers.types'

interface TransferDetailPanelProps {
  transfer: TrasladeItem
}

// persona de una etapa con su id, o el texto de cómo va esa etapa
const person = (name: string | undefined, id: number | undefined, fallback: string): string =>
  name ? `${name}${id ? ` (ID #${id})` : ''}` : fallback

// detalle de un traslado: datos, empleados, repuestos y notas
export const TransferDetailPanel: React.FC<TransferDetailPanelProps> = ({ transfer }) => {
  const dispatch = useAppDispatch()
  const { detail, loading } = useTransferDetail(transfer)
  const images = useProductImages((detail?.products ?? []).map((item) => item.productId))

  if (!detail) {
    return (
      <div className="transfer-detail">
        <div className="transfer-detail-body">
          <p className="transfer-detail-note">{loading ? 'Cargando detalle del traslado…' : 'No se encontró información del traslado.'}</p>
        </div>
      </div>
    )
  }

  const isNovelty = detail.status === 'with_novelty' || Boolean(detail.noveltyNotes)
  const badge = TRANSFER_STATUS_BADGE[detail.status]
  const products = detail.products ?? []
  const units = products.reduce((sum, p) => sum + p.quantity, 0)

  const facts: Array<[string, string]> = [
    ['Serial', detail.serialCode || '—'],
    ['Estado', badge?.label ?? detail.status ?? '—'],
    ['Tipo', detail.typeLabel || 'Solicitud'],
    ['Creado', detail.createdAt ? formatDateTime(detail.createdAt) : '—'],
    ['Bodega origen', detail.originWarehouse?.name || '—'],
    ['Bodega destino', detail.destWarehouse?.name || '—'],
    ['Solicitado por', person(detail.employeeName, detail.employeeId, 'No especificado')],
    ['Despachado por', person(detail.dispatchedByEmployeeName, detail.dispatchedByEmployeeId, 'Pendiente de despacho')],
    ['Recibido por', person(detail.receivedByEmployeeName, detail.receivedByEmployeeId, detail.status === 'in_transit' ? 'En tránsito' : 'Pendiente')],
  ]

  return (
    <div className="transfer-detail">
      <div className="transfer-detail-body">
        {isNovelty && (
          <div className="transfer-detail-alert" role="alert">
            <strong>Novedad registrada (alta prioridad)</strong>
            <p>{detail.noveltyNotes || 'Se registraron discrepancias o averías al momento de la recepción física.'}</p>
          </div>
        )}

        <dl className="transfer-detail-facts">
          {facts.map(([label, value]) => (
            <div key={label} className="transfer-detail-fact">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        {products.length === 0 ? (
          <p className="transfer-detail-empty">{loading ? 'Cargando repuestos del traslado…' : 'No hay repuestos registrados en este traslado.'}</p>
        ) : (
          <ProductLineList>
            {products.map((item) => (
              <ProductLine key={item.itemId} name={item.description} code={item.code} imageUrl={images[item.productId]} quantity={item.quantity} note={`Ubicación destino: ${item.destinationLocation || 'Por asignar'}`} />
            ))}
          </ProductLineList>
        )}

        <p className="transfer-detail-total">
          Total <strong>{units} uds.</strong> en {products.length} {products.length === 1 ? 'ítem' : 'ítems'}
        </p>
        {detail.notes && <p className="transfer-detail-notes">{detail.notes}</p>}
      </div>

      <div className="transfer-detail-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>
          Cerrar
        </button>
      </div>
    </div>
  )
}

export default TransferDetailPanel
