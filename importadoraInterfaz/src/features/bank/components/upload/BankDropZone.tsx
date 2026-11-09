// BankDropZone.tsx · zona interactiva Drag & Drop para cargar extractos bancarios en PDF
import React, { useRef, useState } from 'react'
import './BankDropZone.css'
import { useBankUpload } from '../../hooks/useBankUpload'

export const BankDropZone: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useBankUpload()
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) upload.send(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) upload.send(file)
  }

  return (
    <div
      className={`bank-dropzone ${isDragging ? 'bank-dropzone-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={handleChange}
      />
      <svg
        className="bank-dropzone-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>

      <h3 className="bank-dropzone-title">
        {upload.status === 'loading'
          ? 'Procesando y extrayendo movimientos del banco…'
          : 'Arrastra aquí el extracto bancario en formato PDF'}
      </h3>
      <p className="bank-dropzone-desc">
        {upload.status === 'loading'
          ? 'Por favor espera mientras el sistema mapea las entradas y referencias del extracto.'
          : 'O haz clic en cualquier lugar de esta zona para buscarlo en tus archivos. La conciliación de pagos se habilitará una vez procesado el extracto.'}
      </p>

      <div className="bank-dropzone-badge">
        <span>Formatos admitidos: <strong>Extractos PDF (Bancolombia, BBVA, etc.)</strong></span>
      </div>
    </div>
  )
}

export default BankDropZone

