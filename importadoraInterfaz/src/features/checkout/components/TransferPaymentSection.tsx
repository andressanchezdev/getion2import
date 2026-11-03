// TransferPaymentSection · bloque de la forma de pago por transferencia: aviso, comprobante (foto o PDF) y referencia
// conecta con: PaymentStep (lo pinta cuando se elige transferencia), useCheckoutFlow (comprobante y referencia) y CheckoutPanel.css
import React from 'react'
import { optimizeImageFile } from '@/global/helpers/images/imageOptimizer'
import type { useCheckoutFlow } from '../hooks/useCheckoutFlow'

type Flow = ReturnType<typeof useCheckoutFlow>

// lee el archivo elegido como data URL y lo entrega al flujo
const readProof = async (file: File, onRead: (dataUrl: string) => void) => {
  try {
    const opt = await optimizeImageFile(file, { maxWidth: 1000, maxHeight: 1000, quality: 0.8 })
    onRead(opt.dataUrl)
  } catch {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') onRead(reader.result)
    }
    reader.readAsDataURL(file)
  }
}

// comprobante obligatorio y referencia de la transferencia
export const TransferPaymentSection: React.FC<{ flow: Flow }> = ({ flow }) => (
    <div className="checkout-transfer-section">
      <div className="checkout-transfer-alert">
        <div>
          <strong>Comprobante de pago obligatorio</strong>
          <p>El pedido quedará asociado a este comprobante en estado «Por verificar» para validación de recaudo por tesorería / caja.</p>
        </div>
      </div>

      <label className="checkout-field-label">
        Soporte de la transferencia *
      </label>

      {flow.transferProof ? (
        <div className="checkout-transfer-preview-card">
          {flow.transferProof.startsWith('data:image') ? (
            <img src={flow.transferProof} alt="Comprobante de transferencia" className="checkout-transfer-thumbnail" />
          ) : (
            <div className="checkout-transfer-file">PDF</div>
          )}
          <div className="checkout-transfer-preview-info">
            <strong>Comprobante adjunto</strong>
            <small>Listo para asociar al pedido</small>
          </div>
          <button
            type="button"
            className="btn-secondary checkout-btn-compact"
            onClick={() => flow.setTransferProof('')}
          >
            Cambiar
          </button>
        </div>
      ) : (
        <div>
          <label className="checkout-transfer-upload-btn">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) readProof(file, flow.setTransferProof)
              }}
            />
            <strong>Adjuntar foto o captura de la transferencia</strong>
            <small>Haz clic para seleccionar comprobante (JPG, PNG, WebP o PDF)</small>
          </label>
          {!flow.transferProof && (
            <small className="checkout-field-error">
              * Se requiere el comprobante para confirmar el pedido por transferencia.
            </small>
          )}
        </div>
      )}

      <div className="checkout-field-row">
        <div className="checkout-field">
          <label className="checkout-field-label">
            Referencia / CUS / Nro. Aprobación:
          </label>
          <input
            type="text"
            className="checkout-search checkout-search-compact"
            placeholder="Ej. CUS-983021 o últimos 6 dígitos"
            value={flow.transferReference}
            onChange={(e) => flow.setTransferReference(e.target.value)}
          />
        </div>
      </div>
    </div>
)

export default TransferPaymentSection
