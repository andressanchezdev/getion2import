// useParticleAnimation · dibuja en un canvas la arena que forma el logo mientras el protector está activo
// conecta con: IdleScreensaver (le pasa el canvas), screensaver.image (puntos del logo), screensaver.physics (movimiento) y screensaver.constants (dibujo)
// ojo: se dibuja con un buffer de píxeles (ImageData) y no con miles de fillRect, para que 20 mil puntos no pesen; el lienzo interno es más pequeño que la ventana y el CSS lo estira
// ojo: el cursor remueve la arena mientras se mueve y no hace nada si está quieto; con el clic sostenido en vez de remover se GIRA la imagen en 3D (horizontal y vertical, sin límite); soltar el clic cierra el protector (lo decide useIdle)
// ojo: con "reducir movimiento" activado en el sistema el logo aparece ya formado y quieto
import { useEffect, type RefObject } from 'react'
import logoSrc from '@/assets/images/screensaver-logo.jpg'
import { SCREENSAVER_RENDER, SCREENSAVER_VIEW } from '../constants/screensaver.constants'
import { loadScreensaverTargets } from '../helpers/screensaver.image'
import { createField, getLayout, getPhase, snapToTargets, stepField } from '../helpers/screensaver.physics'
import { trackScreensaverInput } from '../helpers/screensaver.input'
import { projectPoint } from '../helpers/screensaver.view'

export const useParticleAnimation = (
  canvasRef: RefObject<HTMLCanvasElement | null>,
  active: boolean,
  customImageSrc?: string
): void => {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!active || !canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    let frame = 0
    let cancelled = false
    let cleanup = () => {}
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const activeLogo = customImageSrc || localStorage.getItem('custom_screensaver_logo') || logoSrc
    loadScreensaverTargets(activeLogo)
      .then((targets) => {
        if (cancelled) return

        const resize = () => {
          const scale = Math.min(1, SCREENSAVER_RENDER.MAX_CANVAS_WIDTH / window.innerWidth)
          canvas.width = Math.max(1, Math.round(window.innerWidth * scale))
          canvas.height = Math.max(1, Math.round(window.innerHeight * scale))
        }
        resize()

        let layout = getLayout(canvas.width, canvas.height, targets.aspect)
        const field = createField(targets.count, canvas.width, canvas.height)
        if (reducedMotion) snapToTargets(field, targets, layout)

        // el cursor y el giro con el clic sostenido se reinician cada vez que aparece el protector
        const input = trackScreensaverInput(canvas)

        const render = () => {
          const { width, height } = canvas
          const image = context.createImageData(width, height)
          const pixels = new Uint32Array(image.data.buffer)
          pixels.fill(SCREENSAVER_RENDER.BACKGROUND)
          const size = SCREENSAVER_RENDER.DOT_SIZE
          const { view } = input
          const rotated = view.yaw !== 0 || view.pitch !== 0
          const cx = layout.left + layout.width / 2
          const cy = layout.top + layout.height / 2
          const depth = layout.width * SCREENSAVER_VIEW.DEPTH_RATIO
          const focal = layout.width * SCREENSAVER_VIEW.FOCAL_RATIO
          for (let i = 0; i < field.count; i += 1) {
            let px: number
            let py: number
            if (rotated) {
              const [rx, ry] = projectPoint(field.x[i] - cx, field.y[i] - cy, field.z[i] * depth, view, focal)
              px = Math.round(cx + rx)
              py = Math.round(cy + ry)
            } else {
              px = Math.round(field.x[i])
              py = Math.round(field.y[i])
            }
            if (px < 0 || py < 0 || px > width - size || py > height - size) continue
            for (let dy = 0; dy < size; dy += 1) {
              const row = (py + dy) * width + px
              for (let dx = 0; dx < size; dx += 1) pixels[row + dx] = targets.color[i]
            }
          }
          context.putImageData(image, 0, 0)
        }

        const onResize = () => {
          resize()
          layout = getLayout(canvas.width, canvas.height, targets.aspect)
          if (reducedMotion) {
            snapToTargets(field, targets, layout)
            render()
          }
        }
        window.addEventListener('resize', onResize)

        if (reducedMotion) {
          render()
        } else {
          const start = performance.now()
          let last = start
          const tick = (now: number) => {
            const dt = (now - last) / 1000
            // ojo: la velocidad del cursor se apaga sola; si el mouse se detiene, el efecto desaparece en una fracción de segundo
            input.fade(dt)
            stepField(field, targets, layout, getPhase(now - start), dt, now - start, input.pointer)
            last = now
            render()
            frame = requestAnimationFrame(tick)
          }
          frame = requestAnimationFrame(tick)
        }

        cleanup = () => {
          window.removeEventListener('resize', onResize)
          input.dispose()
          cancelAnimationFrame(frame)
        }
      })
      .catch(() => {
        // sin imagen no hay protector: queda el fondo liso y la app sigue funcionando
      })

    return () => {
      cancelled = true
      cleanup()
    }
  }, [active, canvasRef, customImageSrc])
}
