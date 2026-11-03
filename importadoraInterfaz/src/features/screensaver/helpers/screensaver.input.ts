// screensaver.input · entrada del usuario sobre el protector: el cursor que remueve la arena y el clic (o dedo) sostenido que gira la imagen
// conecta con: useParticleAnimation (crea el seguimiento al empezar y lo suelta al terminar), screensaver.view (giro) y screensaver.constants (velocidad del cursor y del giro)
// ojo: el cursor se guarda en coordenadas del lienzo (más pequeño que la ventana) con su velocidad suavizada; mientras se sostiene el clic el cursor no remueve la arena y solo gira
import { SCREENSAVER_POINTER, SCREENSAVER_VIEW } from '../constants/screensaver.constants'
import type { ScreensaverPointer } from '../types/screensaver.types'
import { rotateView, type ScreensaverView } from './screensaver.view'

export interface ScreensaverInput {
  pointer: ScreensaverPointer // dónde está el cursor y qué tan rápido se mueve (null si no está sobre la pantalla o se sostiene el clic)
  view: ScreensaverView // cuánto se ha girado la imagen con el clic sostenido
  fade: (seconds: number) => void // apaga la velocidad del cursor con el paso del tiempo (un mouse quieto no deja hueco)
  dispose: () => void // deja de escuchar
}

type Pointish = { clientX: number; clientY: number }
const pointOf = (event: MouseEvent | TouchEvent): Pointish | undefined => ('touches' in event ? event.touches[0] : event)

// empieza a escuchar el mouse y el toque sobre la ventana; el estado se lee del objeto devuelto
export const trackScreensaverInput = (canvas: HTMLCanvasElement): ScreensaverInput => {
  let dragging = false
  let lastDrag = { x: 0, y: 0 }
  let lastMove = 0

  const input: ScreensaverInput = {
    pointer: null,
    view: { yaw: 0, pitch: 0 },
    fade: (seconds) => {
      if (!input.pointer) return
      const decay = Math.exp(-SCREENSAVER_POINTER.VELOCITY_DECAY * seconds)
      input.pointer.vx *= decay
      input.pointer.vy *= decay
    },
    dispose: () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchstart', onDown)
      window.removeEventListener('touchmove', onDragMove)
      window.removeEventListener('touchend', onUp)
      document.documentElement.removeEventListener('mouseleave', onLeave)
    },
  }

  // el cursor se mueve: guarda su posición y su velocidad suavizada
  const onPointerMove = (event: MouseEvent) => {
    const ratio = canvas.width / window.innerWidth
    const x = event.clientX * ratio
    const y = event.clientY * ratio
    const now = performance.now()
    if (input.pointer && lastMove > 0) {
      const seconds = Math.max(0.008, (now - lastMove) / 1000)
      input.pointer.vx = input.pointer.vx * 0.5 + ((x - input.pointer.x) / seconds) * 0.5
      input.pointer.vy = input.pointer.vy * 0.5 + ((y - input.pointer.y) / seconds) * 0.5
      input.pointer.x = x
      input.pointer.y = y
    } else {
      input.pointer = { x, y, vx: 0, vy: 0 }
    }
    lastMove = now
  }

  // el cursor sale de la página: se borra
  const onLeave = () => {
    input.pointer = null
    lastMove = 0
  }

  // empieza el clic (o el dedo) sostenido: el cursor deja de remover la arena
  const onDown = (event: MouseEvent | TouchEvent) => {
    const point = pointOf(event)
    if (!point) return
    dragging = true
    lastDrag = { x: point.clientX, y: point.clientY }
    input.pointer = null
  }

  // arrastrando con el clic sostenido: gira la imagen según lo que se movió
  const onDragMove = (event: MouseEvent | TouchEvent) => {
    const point = pointOf(event)
    if (!dragging || !point) return
    const turned = rotateView(input.view, point.clientX - lastDrag.x, point.clientY - lastDrag.y, SCREENSAVER_VIEW.ROTATE_SPEED)
    input.view.yaw = turned.yaw
    input.view.pitch = turned.pitch
    lastDrag = { x: point.clientX, y: point.clientY }
  }

  // se suelta el clic: termina el giro (el cierre del protector lo decide useIdle)
  const onUp = () => {
    dragging = false
  }

  const onMove = (event: MouseEvent) => (dragging ? onDragMove(event) : onPointerMove(event))

  window.addEventListener('mousemove', onMove, { passive: true })
  window.addEventListener('mousedown', onDown)
  window.addEventListener('mouseup', onUp)
  window.addEventListener('touchstart', onDown, { passive: true })
  window.addEventListener('touchmove', onDragMove, { passive: true })
  window.addEventListener('touchend', onUp)
  document.documentElement.addEventListener('mouseleave', onLeave)
  return input
}
