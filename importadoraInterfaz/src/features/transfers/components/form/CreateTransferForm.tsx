// CreateTransferForm · pedido de traslado en el panel derecho: el empleado ve su sede destino y el desglose de bodegas; el administrador elige bodega de destino
// conecta con: useTransferRequest, TransferWarehouseStockList, TransferProductPicker, TransferRequestResults, navigation (closeDrawerForm) y DrawerFormShell.css
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './TransferFormShell.css'
import './TransferRequest.css'
import { closeDrawerForm } from '@/features/navigation'
import { Icon } from '@/global/components/UI/atoms/Icon'
import plusIcon from '@/assets/icons/plus.svg?raw'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { useTransferRequest, type CreateTransferInitialPayload } from '../../hooks/useTransferRequest'
import { TransferWarehouseStockList } from './TransferWarehouseStockList'
import { TransferProductPicker } from './TransferProductPicker'
import { TransferRequestResults } from './TransferRequestResults'
import { TransferDestinationSection } from './TransferDestinationSection'
import { TransferDraftSummary } from './TransferDraftSummary'

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
    <div className="drawer-form transfer-form">
      <div className="drawer-form-body transfer-form-body">
        {/* Sección: Sede Destino (Recepción) */}
        <div className="drawer-form-section">
          <TransferDestinationSection
            isEmployee={request.isEmployee}
            destWarehouseName={request.destWarehouseName}
            destWarehouseId={request.destWarehouseId}
            warehouses={request.warehouses}
            onSelectDestId={request.setDestWarehouseId}
            localStockInDest={request.localStockInDest}
            hasFocusedProduct={Boolean(focusedProduct)}
          />
        </div>

        {/* Resultados si se acaba de enviar */}
        {results && <TransferRequestResults results={results} />}

        {(!results || pending) && (
          <>
            {!hasDest ? (
              <div className="transfer-empty-alert">
                <p>Selecciona la sede destino para verificar disponibilidad y configurar el traslado.</p>
              </div>
            ) : focusedProduct ? (
              /* Sección: MODO PRODUCTO ENFOCADO */
              <div className="drawer-form-section transfer-focused-wrapper">
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
                  className="transfer-add-more-btn btn-secondary"
                  onClick={() => request.setFocusedProduct(null)}
                >
                  <Icon svg={plusIcon} size="sm" />
                  <span>Buscar o agregar otro repuesto a esta solicitud</span>
                </button>
              </div>
            ) : (
              /* Sección: MODO BUSCADOR DE PRODUCTOS */
              <div className="drawer-form-section transfer-picker-wrapper">
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

            {/* Sección: RESUMEN AGRUPADO POR BODEGA DE ORIGEN */}
            <div className="drawer-form-section">
              <TransferDraftSummary
                originGroups={originGroups}
                destWarehouseName={request.destWarehouseName}
                onClear={request.clear}
                onRemoveLine={request.remove}
                onSelectProduct={(p) => request.setFocusedProduct(p)}
              />
            </div>

            {/* Sección: Observación y Prioridad */}
            <div className="drawer-form-section">
              <div className="drawer-form-field">
                <label htmlFor="transfer-notes" className="drawer-form-label">
                  Observación (Opcional)
                </label>
                <textarea
                  id="transfer-notes"
                  className="drawer-form-control"
                  rows={2}
                  placeholder="Instrucciones o motivo del traslado…"
                  value={request.notes}
                  onChange={(e) => request.setNotes(e.target.value)}
                />
              </div>

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
            </div>
          </>
        )}

        {request.error && <div className="form-field-error-msg">{request.error}</div>}
      </div>

      <div className="drawer-form-footer transfer-form-footer">
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
