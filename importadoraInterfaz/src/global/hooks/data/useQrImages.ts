// useQrImages · genera las imágenes QR de una lista de textos y las entrega por texto (mientras se generan quedan sin imagen)
// conecta con: QrLabelSheet (lo usa) y global qr (qrDataUrl)
// ojo: si cambia la lista se vuelven a generar solo las que faltan; una respuesta que llega tarde de una lista anterior no pisa a la actual
import { useEffect, useState } from 'react'
import { qrDataUrl } from '@/global/helpers/qr/qr'

export const useQrImages = (values: string[]): Record<string, string> => {
  const [images, setImages] = useState<Record<string, string>>({})
  const key = values.join('\n')

  useEffect(() => {
    let cancelled = false
    const wanted = key ? key.split('\n') : []
    wanted.forEach((value) => {
      qrDataUrl(value)
        .then((url) => {
          if (!cancelled) setImages((current) => (current[value] === url ? current : { ...current, [value]: url }))
        })
        .catch(() => {
          // sin imagen: la etiqueta muestra el texto y sigue funcionando
        })
    })
    return () => {
      cancelled = true
    }
  }, [key])

  return images
}
