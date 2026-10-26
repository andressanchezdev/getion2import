// CreateTransferModal · modal de solicitud de traslado y reubicación multibodega
// conecta con: transfers.service, useTransferProductSearch (búsqueda de repuestos), TransferFormFields y Redux
import React, { useState } from 'react'
import './CreateTransferModal.css'
import { getErrorMessage } from '@/api'
import { useAppSelector } from '@/global/hooks/useRedux'
import { createTransfer } from '../services/transfers.service'
import { useTransferProductSearch } from '../hooks/useTransferProductSearch'
import { TransferFormFields } from './TransferFormFields'
import type { ProductStockMatrix } from '../types/transfers.types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const CreateTransferModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAppSelector((state) => state.auth)
  const warehouses = useAppSelector((state) => state.warehouses.items)
  const [search, setSearch] = useState('')
  const products = useTransferProductSearch(isOpen, search)
  const [selectedProduct, setSelectedProduct] = useState<ProductStockMatrix | null>(null)
  const [originWarehouseId, setOriginWarehouseId] = useState(0)
  const [destWarehouseId, setDestWarehouseId] = useState(0)
  const [quantity, setQuantity] = useState('1')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdSerial, setCreatedSerial] = useState<number | null>(null) // serial que devolvió el backend (puede faltar)
  const [created, setCreated] = useState(false) // el traslado se registró
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const maxAvailable = selectedProduct?.locations.find((l) => l.warehouseId === originWarehouseId)?.availableStock ?? 0

  const handleCreate = async () => {
    if (!selectedProduct || !originWarehouseId || !destWarehouseId || !user) return
    if (originWarehouseId === destWarehouseId) {
      return setErrorMsg('La bodega de origen y destino no pueden ser iguales')
    }
    const qty = parseInt(quantity, 10)
    if (isNaN(qty) || qty <= 0 || qty > maxAvailable) {
      return setErrorMsg(`La cantidad debe ser entre 1 y ${maxAvailable} uds`)
    }
    try {
      setIsSubmitting(true)
      setErrorMsg(null)
      const payload = {
        productId: selectedProduct.productId,
        productName: selectedProduct.description,
        productCode: selectedProduct.code,
        originWarehouseId,
        destWarehouseId,
        quantity: qty,
      }
      const res = await createTransfer(payload, user.companyId, user.userId)
      setCreatedSerial(res.serialCode)
      setCreated(true)
      onSuccess()
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Error al registrar el traslado'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="transfer-modal-backdrop" role="dialog" aria-modal="true">
      <div className="transfer-modal-card">
        <div className="transfer-modal-header">
          <h3 className="transfer-modal-title">Reubicación Multibodega de Repuestos</h3>
          <button type="button" className="transfer-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="transfer-modal-body">
          {created ? (
            <div className="transfer-serial-alert">
              <h4>¡Traslado Despachado con Éxito!</h4>
              <p>Código Único de Entrega (Serial de Verificación Física):</p>
              <div className="transfer-serial-number">{createdSerial ? `#${createdSerial}` : 'Pendiente'}</div>
              <p>
                {createdSerial
                  ? 'El operario receptor deberá ingresar este serial para validar la recepción.'
                  : 'El servidor no devolvió el serial. Búscalo en la lista de traslados: el receptor lo necesita para validar la recepción.'}
              </p>
            </div>
          ) : (
            <>
              <div className="transfer-search-box">
                <label className="transfer-select-label">1. Buscar Repuesto / Producto</label>
                <input
                  type="text"
                  placeholder="Escribe código o descripción..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="transfer-select-control"
                />
              </div>

              {products.length > 0 && !selectedProduct && (
                <div className="transfer-products-dropdown">
                  {products.slice(0, 5).map((p) => (
                    <div
                      key={p.productId}
                      className="transfer-product-opt"
                      onClick={() => {
                        setSelectedProduct(p)
                        const f = p.locations.find((l) => l.availableStock > 0)
                        if (f) setOriginWarehouseId(f.warehouseId)
                      }}
                    >
                      <strong>{p.code}</strong> · {p.description} ({p.totalAvailable} disponibles)
                    </div>
                  ))}
                </div>
              )}

              {selectedProduct && (
                <TransferFormFields
                  product={selectedProduct} warehouses={warehouses}
                  originWarehouseId={originWarehouseId} destWarehouseId={destWarehouseId}
                  quantity={quantity} maxAvailable={maxAvailable} errorMsg={errorMsg}
                  onOriginChange={setOriginWarehouseId} onDestChange={setDestWarehouseId}
                  onQuantityChange={setQuantity}
                />
              )}
            </>
          )}
        </div>

        <div className="transfer-modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {created ? 'Cerrar' : 'Cancelar'}
          </button>
          {!created && (
            <button
              type="button" className="btn-primary" onClick={handleCreate}
              disabled={isSubmitting || !selectedProduct || !originWarehouseId || !destWarehouseId || maxAvailable === 0}
            >
              {isSubmitting ? 'Despachando...' : 'Crear Traslado'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default CreateTransferModal
