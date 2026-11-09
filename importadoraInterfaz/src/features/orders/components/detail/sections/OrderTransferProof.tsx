// OrderTransferProof · comprobante de una transferencia dentro del detalle del pedido: estado, referencia, miniatura y vista completa dentro del mismo panel
// conecta con: OrderSummarySection (la usa solo si el pago es por transferencia), OrderSectionParts (etiqueta de estado)
// ojo: no pide nada al backend: el comprobante y la referencia llegan ya leídos del pedido
import React, { useState } from 'react'
import { YesNoPill } from './OrderSectionParts'
import './OrderTransferProof.css'

interface OrderTransferProofProps {
  proof?: string | null // dirección de la imagen del comprobante
  reference?: string | null // referencia, CUS o número de aprobación
  verified: boolean // si el pago ya fue verificado en caja
  serial: string // serie del pedido, para el texto de la imagen
}

export const OrderTransferProof: React.FC<OrderTransferProofProps> = ({ proof, reference, verified, serial }) => {
  const [open, setOpen] = useState(false)

  return (
    <div className="order-proof-box">
      <div className="order-proof-head">
        <span className="order-proof-title">Comprobante de transferencia</span>
        <YesNoPill ok={verified} yes="Verificado" no="Por verificar en caja" />
      </div>

      {reference && (
        <div className="order-proof-ref">
          <strong>Referencia / CUS:</strong> {reference}
        </div>
      )}

      {proof ? (
        <div className="order-proof-preview">
          <img src={proof} alt="Comprobante de pago" className="order-proof-img" title="Clic para ver en tamaño completo" onClick={() => setOpen((current) => !current)} />
          <div className="order-proof-meta">
            <strong>Comprobante adjunto</strong>
            <button type="button" className="btn-secondary order-proof-view" onClick={() => setOpen((current) => !current)}>
              {open ? 'Ocultar comprobante' : 'Ver comprobante completo'}
            </button>
          </div>
        </div>
      ) : (
        <p className="order-proof-missing" role="alert">
          No se adjuntó imagen del comprobante.
        </p>
      )}

      {open && proof && <img src={proof} alt={`Comprobante completo del pedido ${serial}`} className="order-proof-full" />}
    </div>
  )
}

export default OrderTransferProof
