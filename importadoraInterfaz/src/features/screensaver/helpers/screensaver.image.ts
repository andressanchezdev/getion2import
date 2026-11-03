// screensaver.image · carga la imagen del logo y la convierte en puntos objetivo (con soporte dinámico de cambio de logo)
import { SCREENSAVER_SAMPLING } from '../constants/screensaver.constants'
import type { ScreensaverTargets } from '../types/screensaver.types'
import { pickTargets } from './screensaver.sampling'

let cached: { src: string; promise: Promise<ScreensaverTargets> } | null = null

const readTargets = (src: string): Promise<ScreensaverTargets> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      const width = SCREENSAVER_SAMPLING.SAMPLE_WIDTH
      const height = Math.round((image.naturalHeight / image.naturalWidth) * width)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return reject(new Error('El navegador no permite leer la imagen del protector de pantalla'))
      context.drawImage(image, 0, 0, width, height)
      resolve(pickTargets(context.getImageData(0, 0, width, height).data, width, height))
    }
    image.onerror = () => reject(new Error('No se pudo cargar la imagen del protector de pantalla'))
    image.src = src
  })

// devuelve los puntos del logo; guarda en caché por src
export const loadScreensaverTargets = (src: string): Promise<ScreensaverTargets> => {
  if (!cached || cached.src !== src) {
    cached = { src, promise: readTargets(src) }
    cached.promise.catch(() => {
      cached = null
    })
  }
  return cached.promise
}
