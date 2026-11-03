// qr · convierte un texto en la imagen de un código QR (data URL PNG) legible por la cámara de un celular y por lectores de código
// conecta con: useQrImages (lo pide para cada etiqueta) y la librería qrcode; no sabe qué significa el texto (eso lo define cada feature, por ejemplo locations.qr)
// ojo: corrección de errores nivel M y margen de 2 módulos (la zona en blanco que piden los lectores); el ancho es en píxeles de la imagen
import QRCode from 'qrcode'

// lado de la imagen del QR que se pinta en pantalla y se imprime en las etiquetas
export const QR_IMAGE_SIZE = 220

// imagen PNG (data URL) del QR del texto; rechaza si el texto está vacío
export const qrDataUrl = (text: string, size: number = QR_IMAGE_SIZE): Promise<string> => {
  if (!text) return Promise.reject(new Error('No hay texto para el código QR.'))
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 2, width: size })
}
