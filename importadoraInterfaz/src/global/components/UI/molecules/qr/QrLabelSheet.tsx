// QrLabelSheet · hoja de etiquetas con código QR para pegar en estantes y productos, con botón de imprimir
// conecta con: DrawerRight (formRegistry, panel «qrLabels»), useQrImages (imágenes) y QrLabelSheet.css (pantalla e impresión)
// ojo: al imprimir solo sale la hoja de etiquetas (el resto de la pantalla se oculta con @media print)
import React from 'react'
import './QrLabelSheet.css'
import { closeDrawerForm } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { useQrImages } from '@/global/hooks/data/useQrImages'

// una etiqueta: lo que dice el QR y lo que se lee en el papel
export interface QrLabel {
  value: string // texto que guarda el QR
  title: string // lo más grande de la etiqueta (código del producto o de la ubicación)
  subtitle?: string // segunda línea (nombre del producto o descripción)
  caption?: string // línea pequeña (por ejemplo la bodega y la ubicación)
}

export interface QrLabelsPayload {
  heading: string // título de la hoja
  labels: QrLabel[]
}

// las etiquetas en rejilla con su QR y el botón de imprimir
export const QrLabelSheet: React.FC<{ payload: QrLabelsPayload }> = ({ payload }) => {
  const dispatch = useAppDispatch()
  const images = useQrImages(payload.labels.map((label) => label.value))

  return (
    <div className="qr-panel">
      <div className="qr-panel-body">
        <p className="qr-panel-note">
          Imprime y pega cada etiqueta en su estante. El código se lee con la cámara del celular o con un lector de código de barras.
        </p>
        <div className="qr-sheet" aria-label={payload.heading}>
          {payload.labels.map((label) => (
            <figure key={label.value} className="qr-label">
              {images[label.value] ? <img className="qr-label-img" src={images[label.value]} alt={`Código QR de ${label.title}`} /> : <div className="qr-label-img qr-label-img-empty" />}
              <figcaption className="qr-label-text">
                <strong className="qr-label-title">{label.title}</strong>
                {label.subtitle && <span className="qr-label-subtitle">{label.subtitle}</span>}
                {label.caption && <small className="qr-label-caption">{label.caption}</small>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      <div className="qr-panel-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>
          Cerrar
        </button>
        <button type="button" className="btn-primary" onClick={() => window.print()}>
          Imprimir etiquetas
        </button>
      </div>
    </div>
  )
}

export default QrLabelSheet
