// CreateTransferForm · pedido de traslado en el panel derecho: cabecera con sede destino y stock local, desglose de bodegas activas y control de cantidades
// conecta con: useTransferRequest, TransferWarehouseStockList, TransferProductPicker, TransferRequestResults y navigation (closeDrawerForm)
import React from 'react'
import './TransferFormShell.css'
import './TransferRequest.css'
import { closeDrawerForm } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { useTransferRequest, type CreateTransferInitialPayload } from '../../hooks/useTransferRequest'
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
  const { results, lines, units, focusedProduct } = request
  const pending = results?.some((result) => result.error) ?? false

  return (
    <div className="transfer-form">
      <div className="transfer-form-body">
        {/* Cabecera limpia: Sede destino + Stock físico actual */}
        {request.isEmployee ? (
          <section className="transfer-header-dest-card" aria-label="Sede de destino del empleado">
            <div className="transfer-dest-left">
              <span className="transfer-dest-icon" aria-hidden="true">📍</span>
              <div className="transfer-dest-details">
                <strong className="transfer-dest-name">{request.destWarehouseName}</strong>
                <span className="transfer-dest-pill">Tu sede actual (Recepción)</span>
              </div>
            </div>
            <div className="transfer-dest-right">
              <span className="transfer-dest-stock-label">Stock físico actual:</span>
              <span className="transfer-dest-stock-qty">{request.localStockInDest} uds</span>
            </div>
          </section>
        ) : (
          <section className="transfer-header-dest-card is-admin" aria-label="Configuración de destino para administradores">
            <div className="transfer-dest-left">
              <span className="transfer-dest-icon" aria-hidden="true">🏢</span>
              <div className="transfer-dest-details">
                <label htmlFor="transfer-admin-dest" className="transfer-admin-label">
                  Bodega de destino (Recepción):
                </label>
                <select
                  id="transfer-admin-dest"
                  className="transfer-select-control"
                  value={request.destWarehouseId}
                  onChange={(e) => request.setDestWarehouseId(Number(e.target.value))}
                >
                  <option value={0}>Seleccionar bodega de destino…</option>
                  {request.warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="transfer-dest-right">
              <span className="transfer-dest-stock-label">Stock en destino:</span>
              <span className="transfer-dest-stock-qty">{request.localStockInDest} uds</span>
            </div>
          </section>
        )}

        {/* Resultados si se acaba de enviar */}
        {results && <TransferRequestResults results={results} />}

        {(!results || pending) && (
          <>
            {/* Ficha del repuesto seleccionado */}
            {focusedProduct && (
              <section className="transfer-focused-product">
                <div className="transfer-focused-info">
                  <span className="transfer-focused-code">{focusedProduct.code}</span>
                  <h3 className="transfer-focused-name">{focusedProduct.name}</h3>
                </div>
                <div className="transfer-focused-net">
                  <span className="transfer-focused-net-label">Total en red:</span>
                  <span className="transfer-focused-net-val">{request.totalRedStock} uds</span>
                </div>
              </section>
            )}

            {/* Desglose de todas las bodegas activas y control de cantidades */}
            {focusedProduct ? (
              <TransferWarehouseStockList
                warehouses={request.warehouses}
                destWarehouseId={request.destWarehouseId}
                focusedProduct={focusedProduct}
                getOriginQty={request.getOriginQty}
                setOriginQty={request.setOriginQty}
              />
            ) : (
              <TransferProductPicker
                search={request.search}
                onSearch={request.setSearch}
                products={request.products}
                searching={request.searching}
                destWarehouseId={request.destWarehouseId}
                onAdd={request.addFrom}
              />
            )}

            {/* Resumen de solicitud acumulada en borrador (memoria a corto plazo) */}
            {lines.length > 0 && (
              <div className="transfer-draft-summary">
                <div className="transfer-draft-summary-head">
                  <div className="transfer-draft-summary-title">
                    <strong>Resumen de solicitud</strong>
                    <span className="transfer-draft-count-pill">{lines.length} {lines.length === 1 ? 'ítem' : 'ítems'}</span>
                  </div>
                  <button type="button" className="transfer-draft-clear-btn" onClick={request.clear}>
                    Vaciar
                  </button>
                </div>

                <ul className="transfer-draft-summary-list">
                  {lines.map((l) => (
                    <li key={`${l.productId}-${l.originWarehouseId}`} className="transfer-summary-row">
                      <div className="transfer-summary-item-text">
                        <strong>{l.code}</strong>
                        <span>desde {l.originWarehouseName}</span>
                      </div>
                      <div className="transfer-summary-actions">
                        <span className="transfer-summary-qty">{l.quantity} uds</span>
                        <button
                          type="button"
                          className="transfer-summary-del"
                          aria-label={`Quitar ${l.code}`}
                          onClick={() => request.remove(l)}
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
              : `Solicitar ${units} ${units === 1 ? 'unidad' : 'unidades'} hacia ${request.destWarehouseName}`}
          </button>
        )}
      </div>
    </div>
  )
}

export default CreateTransferForm
