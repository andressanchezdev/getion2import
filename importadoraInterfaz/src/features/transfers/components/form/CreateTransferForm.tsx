// CreateTransferForm · pedido de traslado en el panel derecho: el empleado ve su sede destino y el desglose de bodegas; el administrador elige bodega de destino
// conecta con: useTransferRequest, TransferWarehouseStockList, TransferProductPicker, TransferRequestResults y navigation (closeDrawerForm)
import React from 'react'
import './TransferFormShell.css'
import './TransferRequest.css'
import { closeDrawerForm } from '@/features/navigation'
import { Icon } from '@/global/components/UI/atoms/Icon'
import mapPinIcon from '@/assets/icons/map-pin.svg?raw'
import buildingIcon from '@/assets/icons/building.svg?raw'
import plusIcon from '@/assets/icons/plus.svg?raw'
import trashIcon from '@/assets/icons/trash.svg?raw'
import lockIcon from '@/assets/icons/lock.svg?raw'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { useTransferRequest, type CreateTransferInitialPayload } from '../../hooks/useTransferRequest'
import { totalUnits } from '../../helpers/transfers.request'
import { TransferWarehouseStockList } from './TransferWarehouseStockList'
import { TransferProductPicker } from './TransferProductPicker'
import { TransferRequestResults } from './TransferRequestResults'

export type { CreateTransferInitialPayload }

interface CreateTransferFormProps {
  initialPayload?: CreateTransferInitialPayload
}

export const CreateTransferForm: React.FC<CreateTransferFormProps> = ({ initialPayload }) => {
  const dispatch = useAppDispatch()
  const request = useTransferRequest(initialPayload)
  const { results, units, focusedProduct, originGroups } = request
  const pending = results?.some((result) => result.error) ?? false
  const hasDest = request.destWarehouseId > 0

  return (
    <div className="transfer-form">
      <div className="transfer-form-body">
        {/* Sede Destino (Recepción) */}
        {request.isEmployee ? (
          <section className="transfer-header-dest-card" aria-label="Sede de destino del empleado">
            <div className="transfer-dest-left">
              <Icon svg={mapPinIcon} size="lg" className="transfer-dest-icon" />
              <div className="transfer-dest-details">
                <strong className="transfer-dest-name">{request.destWarehouseName}</strong>
                <span className="transfer-dest-pill">Tu sede actual (Recepción)</span>
              </div>
            </div>
            {focusedProduct && (
              <div className="transfer-dest-right">
                <span className="transfer-dest-stock-label">Stock en tu sede:</span>
                <span className="transfer-dest-stock-qty">{request.localStockInDest} uds</span>
              </div>
            )}
          </section>
        ) : (
          <section className="transfer-header-dest-card is-admin" aria-label="Sede destino para administradores">
            <div className="transfer-admin-route-single">
              <label htmlFor="transfer-admin-dest" className="transfer-admin-label">
                Sede destino (donde ingresará la mercancía)
              </label>
              <select
                id="transfer-admin-dest"
                className="transfer-select-control"
                value={request.destWarehouseId}
                onChange={(e) => request.setDestWarehouseId(Number(e.target.value))}
              >
                <option value={0} disabled>Seleccionar bodega de destino…</option>
                {request.warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>{wh.name} (#{wh.id})</option>
                ))}
              </select>
            </div>
          </section>
        )}

        {/* Resultados si se acaba de enviar */}
        {results && <TransferRequestResults results={results} />}

        {(!results || pending) && (
          <>
            {!hasDest ? (
              <div className="transfer-empty-alert">
                <p>Selecciona la sede destino para verificar disponibilidad y configurar el traslado.</p>
              </div>
            ) : focusedProduct ? (
              /* MODO PRODUCTO ENFOCADO */
              <div className="transfer-focused-wrapper">
                <section className="transfer-focused-product">
                  <div className="transfer-focused-main">
                    {focusedProduct.imageUrl && (
                      <img src={focusedProduct.imageUrl} alt="" className="transfer-focused-thumb" />
                    )}
                    <div className="transfer-focused-info">
                      <span className="transfer-focused-code">{focusedProduct.code}</span>
                      <h4 className="transfer-focused-name">{focusedProduct.name}</h4>
                    </div>
                  </div>
                  <div className="transfer-focused-net">
                    <span className="transfer-focused-net-label">Total en red:</span>
                    <span className="transfer-focused-net-val">{request.totalRedStock} uds</span>
                  </div>
                </section>

                {/* Matriz compacta de bodegas origen */}
                <TransferWarehouseStockList
                  warehouses={request.warehouses}
                  destWarehouseId={request.destWarehouseId}
                  stockByWarehouse={request.stockByWarehouse}
                  loading={request.stockLoading}
                  error={request.stockError}
                  getOriginQty={request.getOriginQty}
                  setOriginQty={request.setOriginQty}
                />

                {/* Botón para alternar a búsqueda de otros productos */}
                <button
                  type="button"
                  className="transfer-add-more-btn"
                  onClick={() => request.setFocusedProduct(null)}
                >
                  <Icon svg={plusIcon} size="sm" />
                  <span>Buscar o agregar otro repuesto a esta solicitud</span>
                </button>
              </div>
            ) : (
              /* MODO BUSCADOR DE PRODUCTOS */
              <div className="transfer-picker-wrapper">
                <TransferProductPicker
                  search={request.search}
                  onSearch={request.setSearch}
                  products={request.products}
                  searching={request.searching}
                  destWarehouseId={request.destWarehouseId}
                  originWarehouseId={undefined}
                  onAdd={request.addFrom}
                  onSelectProduct={(p) => request.setFocusedProduct(p)}
                />
              </div>
            )}

            {/* RESUMEN AGRUPADO POR BODEGA DE ORIGEN (Visibilidad de despachos independientes) */}
            {originGroups.length > 0 && (
              <section className="transfer-groups-summary" aria-label="Resumen de despachos a generar">
                <div className="transfer-groups-header">
                  <div>
                    <h4 className="transfer-groups-title">Despachos que se generarán</h4>
                    <span className="transfer-groups-subtitle">
                      {originGroups.length} {originGroups.length === 1 ? 'sede origen involucrada' : 'sedes de origen involucradas'}
                    </span>
                  </div>
                  <button type="button" className="transfer-draft-clear-btn" onClick={request.clear}>
                    Vaciar todo
                  </button>
                </div>

                <div className="transfer-groups-list">
                  {originGroups.map((group) => {
                    const groupQty = totalUnits(group.lines)
                    return (
                      <div key={group.originWarehouseId} className="transfer-origin-group-card">
                        <div className="transfer-group-card-head">
                          <div className="transfer-group-badge-title">
                            <Icon svg={buildingIcon} size="sm" className="transfer-group-icon" />
                            <strong>Desde {group.originWarehouseName}</strong>
                          </div>
                          <span className="transfer-group-count-tag">
                            {group.lines.length} {group.lines.length === 1 ? 'repuesto' : 'repuestos'} · {groupQty} {groupQty === 1 ? 'ud' : 'uds'}
                          </span>
                        </div>

                        <ul className="transfer-group-lines">
                          {group.lines.map((l) => (
                            <li key={`${l.productId}-${l.originWarehouseId}`} className="transfer-group-line-row">
                              <div
                                className="transfer-group-line-content"
                                onClick={() => request.setFocusedProduct({ id: l.productId, code: l.code, name: l.description })}
                                title="Clic para editar cantidades de este producto"
                              >
                                <span className="transfer-line-qty-pill">{l.quantity}x</span>
                                <strong className="transfer-line-code">{l.code}</strong>
                                <span className="transfer-line-desc">{l.description}</span>
                              </div>
                              <button
                                type="button"
                                className="transfer-line-del"
                                aria-label={`Quitar ${l.code}`}
                                title={`Quitar de ${group.originWarehouseName}`}
                                onClick={() => request.remove(l)}
                              >
                                <Icon svg={trashIcon} size="sm" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>

                {/* Callout de trazabilidad y privacidad */}
                <div className="transfer-privacy-callout">
                  <Icon svg={lockIcon} size="sm" className="transfer-privacy-icon" />
                  <div className="transfer-privacy-text">
                    <strong>Privacidad y trazabilidad independiente:</strong>
                    <p>
                      Se {originGroups.length === 1 ? 'creará 1 traslado individual' : `crearán ${originGroups.length} traslados independientes`} hacia <em>{request.destWarehouseName}</em>. Cada sede origen solo verá y despachará sus propios repuestos asignados.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Prioridad de traslado */}
            <div className="transfer-priority-field">
              <label className="transfer-checkbox-label">
                <input
                  type="checkbox"
                  checked={request.isPriority}
                  onChange={(e) => request.setIsPriority(e.target.checked)}
                />
                <span className="transfer-priority-text">Marcar como traslado prioritario (urgente)</span>
              </label>
            </div>
          </>
        )}

        {request.error && <div className="form-field-error-msg">{request.error}</div>}
      </div>

      <div className="transfer-form-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>
          {results && !pending ? 'Cerrar' : 'Cancelar'}
        </button>
        {(!results || pending) && (
          <button
            type="button"
            className="btn-primary"
            onClick={request.submit}
            disabled={request.submitting || units === 0 || !request.destWarehouseId}
          >
            {request.submitting
              ? 'Registrando solicitud…'
              : units === 0
                ? 'Selecciona unidades a trasladar'
                : originGroups.length === 1
                  ? `Solicitar traslado (${units} uds desde ${originGroups[0].originWarehouseName})`
                  : `Solicitar ${originGroups.length} traslados (${units} uds en total)`}
          </button>
        )}
      </div>
    </div>
  )
}

export default CreateTransferForm
