// IdleScreensaver · pantalla completa con la arena que forma el logo; aparece tras un rato sin actividad (SCREENSAVER_TIMING.IDLE_MS) y la arena reacciona al mouse y solo se va con un clic o una tecla
// conecta con: useIdle (cuándo mostrarla), useParticleAnimation (dibujo) y screensaver.constants (textos); la monta ErpLayout
import { useRef } from 'react'
import { SCREENSAVER_LABELS } from '../constants/screensaver.constants'
import { useIdle } from '../hooks/useIdle'
import { useParticleAnimation } from '../hooks/useParticleAnimation'
import './IdleScreensaver.css'

export function IdleScreensaver() {
  const idle = useIdle()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useParticleAnimation(canvasRef, idle)

  if (!idle) return null

  return (
    <div className="idle-screensaver" role="img" aria-label={SCREENSAVER_LABELS.region}>
      <canvas ref={canvasRef} className="idle-screensaver-canvas" />
      <p className="idle-screensaver-hint">{SCREENSAVER_LABELS.hint}</p>
    </div>
  )
}

export default IdleScreensaver
