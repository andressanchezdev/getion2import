// imageOptimizer · compresión y reescalado dinámico de imágenes en el cliente (canvas WebP / JPEG)
// Reduce archivos pesados (3MB - 10MB) a ~50KB - 120KB antes de transmitirlos a la API o guardarlos en DB

export interface OptimizeImageOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  mimeType?: 'image/webp' | 'image/jpeg'
}

export interface OptimizedImageResult {
  dataUrl: string
  sizeBytes: number
  originalSizeBytes: number
  compressionPercent: number
  formattedSize: string
}

export const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Optimiza un archivo de imagen reduciendo sus dimensiones y comprimiéndolo a WebP/JPEG
 */
export const optimizeImageFile = (
  file: File,
  options: OptimizeImageOptions = {}
): Promise<OptimizedImageResult> => {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    mimeType = 'image/webp',
  } = options

  return new Promise((resolve, reject) => {
    // Si no estamos en entorno con FileReader
    if (typeof FileReader === 'undefined') {
      return resolve({
        dataUrl: '',
        sizeBytes: file.size,
        originalSizeBytes: file.size,
        compressionPercent: 0,
        formattedSize: formatBytes(file.size),
      })
    }

    // Si no es imagen (ej. PDF de comprobante bancario), conservar original
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Error al leer el archivo'))
      reader.onload = () => {
        const dataUrl = (reader.result as string) || ''
        resolve({
          dataUrl,
          sizeBytes: file.size,
          originalSizeBytes: file.size,
          compressionPercent: 0,
          formattedSize: formatBytes(file.size),
        })
      }
      reader.readAsDataURL(file)
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Error al leer la imagen seleccionada'))
    reader.onload = () => {
      const rawDataUrl = (reader.result as string) || ''
      // Si estamos en entorno sin DOM o sin soporte Image (ej. SSR / tests básicos), retornar
      if (typeof window === 'undefined' || typeof Image === 'undefined') {
        return resolve({
          dataUrl: rawDataUrl,
          sizeBytes: file.size,
          originalSizeBytes: file.size,
          compressionPercent: 0,
          formattedSize: formatBytes(file.size),
        })
      }

      const img = new Image()
      img.onerror = () => {
        // Fallback si falla la decodificación
        resolve({
          dataUrl: rawDataUrl,
          sizeBytes: file.size,
          originalSizeBytes: file.size,
          compressionPercent: 0,
          formattedSize: formatBytes(file.size),
        })
      }

      img.onload = () => {
        let width = img.width || 800
        let height = img.height || 600

        // Redimensionar manteniendo proporción de aspecto
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.max(1, Math.round(width * ratio))
          height = Math.max(1, Math.round(height * ratio))
        }

        try {
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            return resolve({
              dataUrl: rawDataUrl,
              sizeBytes: file.size,
              originalSizeBytes: file.size,
              compressionPercent: 0,
              formattedSize: formatBytes(file.size),
            })
          }

          ctx.drawImage(img, 0, 0, width, height)

          // Probar WebP primero; si el navegador no lo soporta retorna PNG por defecto, en ese caso usar JPEG
          let dataUrl = canvas.toDataURL(mimeType, quality)
          if (mimeType === 'image/webp' && !dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality)
          }

          const stringLength = dataUrl.length - dataUrl.indexOf(',') - 1
          const sizeBytes = Math.round((stringLength * 3) / 4)
          const savedRatio = file.size > 0 ? Math.max(0, 1 - sizeBytes / file.size) : 0

          resolve({
            dataUrl,
            sizeBytes,
            originalSizeBytes: file.size,
            compressionPercent: Math.round(savedRatio * 100),
            formattedSize: formatBytes(sizeBytes),
          })
        } catch {
          // En caso de cualquier excepción en canvas, no romper el flujo del usuario
          resolve({
            dataUrl: rawDataUrl,
            sizeBytes: file.size,
            originalSizeBytes: file.size,
            compressionPercent: 0,
            formattedSize: formatBytes(file.size),
          })
        }
      }

      img.src = rawDataUrl
    }

    reader.readAsDataURL(file)
  })
}
