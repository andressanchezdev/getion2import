// LocationDetailPanel · detalle de una ubicación en el panel derecho: lo que guarda, y acciones para imprimir su QR, el de cada producto o reubicar un producto
// conecta con: useLocationContent (productos de la ubicación), locations.adapter (etiquetas QR), navigation (abrir QR y reubicar) y DrawerFormShell.css; lo abre formRegistry («locationDetail»)
// ojo: reubicar abre el panel de reubicación del inventario; al terminar se recargan el contenido y la lista (onSuccess)
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './LocationDetailPanel.css'
import { closeDrawerForm, openDrawerForm } from '@/features/navigation'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { useLocationContent } from '../../hooks/useLocationContent'
import { locationLabel, productLabel } from '../../helpers/locations.adapter'
import type { WarehouseLocation } from '../../types/locations.types'

export interface LocationDetailPayload {
  location: WarehouseLocation
  warehouseName: string
  onChanged: () => void // recarga la lista de ubicaciones cuando se mueve algo
}

export const LocationDetailPanel: React.FC<{ payload: LocationDetailPayload }> = ({ payload }) => {
  const dispatch = useAppDispatch()
  const canRelocate = usePermissions().can('stock:relocate')
  const { location, warehouseName } = payload
  const content = useLocationContent(location.warehouseId, location.code)

  const openLabels = (heading: string, labels: ReturnType<typeof productLabel>[]) => dispatch(openDrawerForm({ kind: 'qrLabels', payload: { heading, labels } }))

  return (
    <div className="drawer-form">
      <div className="drawer-form-body">
        <div className="location-detail-head">
          <strong className="location-detail-code">{location.code}</strong>
          <span className="drawer-form-note">{location.description || 'Sin descripción'}</span>
          <span className="drawer-form-hint">
            {warehouseName} · {location.isActive ? 'Activa' : 'Inactiva'} · {content.items.length} productos · {location.units} unidades
          </span>
        </div>

        <section className="drawer-form-section">
          <h4 className="drawer-form-section-title">Productos en esta ubicación</h4>
          {content.status === 'failed' && <div className="form-field-error-msg">{content.error}</div>}
          {content.status !== 'failed' && content.items.length === 0 && <p className="drawer-form-note">{content.status === 'succeeded' ? 'La ubicación está vacía.' : 'Cargando contenido…'}</p>}
          <ul className="location-detail-list">
            {content.items.map((item) => (
              <li key={item.stockId} className="location-detail-item">
                <div className="location-detail-item-text">
                  <strong>{item.productCode}</strong>
                  <span>{item.productName}</span>
                  <small>
                    {item.available} uds · {item.reserved} reservadas
                  </small>
                </div>
                <div className="location-detail-item-actions">
                  <button type="button" className="location-detail-link" onClick={() => openLabels(`Etiqueta de ${item.productCode}`, [productLabel(location.warehouseId, location.code, item.productCode, item.productName, warehouseName)])}>
                    QR
                  </button>
                  <button
                    type="button"
                    className="location-detail-link"
                    disabled={item.sellable <= 0 || !canRelocate}
                    onClick={() =>
                      dispatch(
                        openDrawerForm({
                          kind: 'relocateStock',
                          payload: {
                            stockId: item.stockId,
                            warehouseId: location.warehouseId,
                            productId: item.productId,
                            productCode: item.productCode,
                            productName: item.productName,
                            currentLocation: location.code,
                            availableQuantity: item.sellable,
                            onSuccess: () => {
                              content.reload()
                              payload.onChanged()
                            },
                          },
                        })
                      )
                    }
                  >
                    Reubicar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>
          Cerrar
        </button>
        <button type="button" className="btn-primary" onClick={() => openLabels(`Etiqueta de ${location.code}`, [locationLabel(location, warehouseName)])}>
          QR de la ubicación
        </button>
      </div>
    </div>
  )
}

export default LocationDetailPanel
