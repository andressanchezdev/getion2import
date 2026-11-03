// BankUploadButton · botón de la barra de la conciliación para subir el PDF que entrega el banco: de ahí sale todo lo que se concilia
// conecta con: BankReconciliationScreen (lo pinta a la derecha de la búsqueda) y useBankUpload (subir; los avisos de lo leído o del error salen como alertas)
// ojo: solo PDF; no hay datos de ejemplo: sin PDF subido la lista queda vacía
import React, { useRef } from 'react'
import { useBankUpload } from '../../hooks/useBankUpload'

export const BankUploadButton: React.FC = () => {
  const input = useRef<HTMLInputElement>(null)
  const upload = useBankUpload()

  // sube el archivo elegido y deja el selector listo para otro
  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) upload.send(file)
  }

  return (
    <>
      <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={onFile} />
      <button type="button" className="btn-primary bank-upload-btn" disabled={upload.status === 'loading'} onClick={() => input.current?.click()} title="Sube el PDF que entrega el banco">
        {upload.status === 'loading' ? 'Leyendo el PDF…' : '+ Subir extracto PDF'}
      </button>
    </>
  )
}

export default BankUploadButton
