// NotFoundScreen · pantalla 404 interactiva con partículas formando la imagen 404.jpg
import React, { useRef } from 'react'
import image404Src from '@/assets/images/404.jpg'
import { useParticleAnimation } from '@/features/screensaver'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { setActiveModule, setActiveSubitem } from '@/features/navigation'
import './NotFoundScreen.css'

export const NotFoundScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Activamos la animación de partículas interactiva con la imagen 404.jpg
  useParticleAnimation(canvasRef, true, image404Src)

  const handleReturnHome = () => {
    dispatch(setActiveModule('shop'))
    dispatch(setActiveSubitem('catalog'))
  }

  return (
    <div
      className="not-found-screensaver"
      role="img"
      aria-label="Página no encontrada 404"
      onClick={handleReturnHome}
      title="Haz clic para volver al inicio"
    >
      <canvas ref={canvasRef} className="not-found-canvas" />
    </div>
  )
}
export default NotFoundScreen
