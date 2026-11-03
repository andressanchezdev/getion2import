// screensaver.sampling · convierte los píxeles de la imagen del logo en puntos objetivo (solo lo claro cuenta como tinta)
// conecta con: useParticleAnimation (le pasa los píxeles leídos del canvas), screensaver.constants (umbral y tope) y screensaver.types
import { SCREENSAVER_SAMPLING } from '../constants/screensaver.constants'
import type { ScreensaverTargets } from '../types/screensaver.types'

// brillo percibido de un color (0–255)
export const getLuma = (r: number, g: number, b: number): number => 0.299 * r + 0.587 * g + 0.114 * b

// empaca un color RGB como ABGR (el orden en que lo guarda un Uint32Array sobre ImageData en equipos little-endian)
export const packColor = (r: number, g: number, b: number): number => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0

// lee los píxeles (RGBA) y devuelve los que son tinta, con su posición (de 0 a 1 dentro del recuadro de la tinta) y su color
// ojo: si hay más tinta que el tope, se descarta al azar lo que sobra para que el logo siga completo y no se corte por una esquina
export const pickTargets = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  rand: () => number = Math.random,
  { lumaMin, maxPoints }: { lumaMin: number; maxPoints: number } = {
    lumaMin: SCREENSAVER_SAMPLING.LUMA_MIN,
    maxPoints: SCREENSAVER_SAMPLING.MAX_POINTS,
  },
): ScreensaverTargets => {
  const ink: number[] = []
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 4
    if (data[o + 3] > 0 && getLuma(data[o], data[o + 1], data[o + 2]) >= lumaMin) ink.push(i)
  }

  const keepRatio = ink.length > maxPoints ? maxPoints / ink.length : 1
  const picked = keepRatio < 1 ? ink.filter(() => rand() < keepRatio) : ink

  // ojo: la posición se mide desde el recuadro que encierra la tinta (no desde los bordes de la imagen), así el logo llena la pantalla y no queda chico entre márgenes oscuros
  let minCol = width
  let maxCol = 0
  let minRow = height
  let maxRow = 0
  ink.forEach((pixel) => {
    const col = pixel % width
    const row = Math.floor(pixel / width)
    minCol = Math.min(minCol, col)
    maxCol = Math.max(maxCol, col)
    minRow = Math.min(minRow, row)
    maxRow = Math.max(maxRow, row)
  })
  const boxWidth = Math.max(1, maxCol - minCol + 1)
  const boxHeight = Math.max(1, maxRow - minRow + 1)

  const nx = new Float32Array(picked.length)
  const ny = new Float32Array(picked.length)
  const color = new Uint32Array(picked.length)
  picked.forEach((pixel, index) => {
    const o = pixel * 4
    // ojo: se reparte dentro del píxel (no en su esquina) para que no se note la cuadrícula de la imagen
    nx[index] = ((pixel % width) - minCol + rand()) / boxWidth
    ny[index] = (Math.floor(pixel / width) - minRow + rand()) / boxHeight
    color[index] = packColor(data[o], data[o + 1], data[o + 2])
  })

  return { count: picked.length, nx, ny, color, aspect: boxWidth / boxHeight }
}
