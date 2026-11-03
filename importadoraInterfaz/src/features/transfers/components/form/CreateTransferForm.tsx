// CreateTransferForm · pedido de traslado en el panel derecho: la bodega que recibe, repuestos de una o varias bodegas de origen y un solo botón para enviarlo
// conecta con: useTransferRequest (estado y envío), TransferProductPicker, TransferRequestLines, TransferRequestResults y navigation (closeDrawerForm)
// ojo: por cada bodega de origen se crea un traslado; las bodegas que fallan quedan en el pedido para reintentar
import React from 'react'
import './TransferFormShell.css'
import './TransferRequest.css'
import { closeDrawerForm } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { useTransferRequest, type CreateTransferInitialPayload } from '../../hooks/useTransferRequest'
import { TransferProductPicker } from './TransferProductPicker'
import { TransferRequestLines } from './TransferRequestLines'
import { TransferRequestResults } from './TransferRequestResults'

export type { CreateTransferInitialPayload }

interface CreateTransferFormProps {
  initialPayload?: CreateTransferInitialPayload
}

export const CreateTransferForm: React.FC<CreateTransferFormProps> = ({ initialPayload }) => {
  const dispatch = useAppDispatch()
  const request = useTransferRequest(initialPayload)
  const { results } = request
  const pending = results?.some((result) => result.error) ?? false

  return (
    <div className="transfer-form">
      <div className="transfer-form-body">
        <section className="transfer-req-section">
          <label className="transfer-select-label" htmlFor="transfer-dest">
            Recibe en
          </label>
          {request.isEmployee ? (
            <div className="transfer-dest-locked" id="transfer-dest">
              <strong className="transfer-dest-locked-name">
                {request.destWarehouseName || `Mi bodega (#${request.destWarehouseId})`}
              </strong>
              <small className="transfer-dest-locked-sub">Sede de destino asignada a tu perfil de empleado</small>
            </div>
          ) : (
            <select
              id="transfer-dest"
              className="transfer-select-control"
              value={request.destWarehouseId}
              onChange={(event) => request.setDestWarehouseId(Number(event.target.value))}
            >
              <option value={0}>Elige la bodega…</option>
              {request.warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          )}
        </section>

        {results && <TransferRequestResults results={results} />}

        {(!results || pending) && (
          <>
            <TransferProductPicker
              search={request.search}
              onSearch={request.setSearch}
              products={request.products}
              searching={request.searching}
              destWarehouseId={request.destWarehouseId}
              onAdd={request.addFrom}
            />
            <TransferRequestLines lines={request.lines} onQuantity={request.changeQuantity} onRemove={request.remove} />
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
            disabled={request.submitting || request.lines.length === 0 || !request.destWarehouseId}
          >
            {request.submitting ? 'Enviando…' : `Solicitar ${request.units} ${request.units === 1 ? 'unidad' : 'unidades'}`}
          </button>
        )}
      </div>
    </div>
  )
}

export default CreateTransferForm
