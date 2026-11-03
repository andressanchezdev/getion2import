// useIdle · avisa cuando el usuario lleva un tiempo sin tocar nada y cuándo vuelve
// conecta con: IdleScreensaver (lo usa), screensaver.constants (tiempos y eventos); el cierre de sesión por inactividad es aparte (auth/useSessionActivity)
// ojo: la inactividad se calcula con la hora (Date.now) y no sumando timers, porque los timers se frenan en pestañas dormidas
// ojo: ya dormida la pantalla, mover el mouse, la rueda o el teclado NO la despierta: solo SOLTAR el clic (o el dedo), pasado un instante de gracia; mantener el clic apretado sirve para girar la imagen
// ojo: las teclas se tragan mientras duerme (no escriben en lo que quedó debajo) y el clic que sigue a soltar también se traga un momento (no activa el botón de debajo)
import { useEffect, useRef, useState } from 'react'
import { SCREENSAVER_ACTIVITY_EVENTS, SCREENSAVER_CLICK_SWALLOW_MS, SCREENSAVER_TIMING, SCREENSAVER_WAKE_EVENTS } from '../constants/screensaver.constants'

const WAKE_EVENTS: readonly string[] = SCREENSAVER_WAKE_EVENTS

export const useIdle = (idleMs: number = SCREENSAVER_TIMING.IDLE_MS): boolean => {
  const [idle, setIdle] = useState(false)
  // ojo: viven en refs y no dentro del efecto para que, si el efecto se vuelve a montar (recarga en caliente, StrictMode), la pantalla dormida no pierda su estado y siga cerrándose solo con clic o tecla
  const lastActivityRef = useRef(0)
  const sleepingSinceRef = useRef(0) // hora en que se durmió la pantalla (0 = despierta)
  const wokeAtRef = useRef(0) // hora en que despertó (para tragarse el clic que sigue a soltar)

  useEffect(() => {
    const { CHECK_MS, WAKE_GRACE_MS } = SCREENSAVER_TIMING
    const lastActivity = lastActivityRef
    const sleepingSince = sleepingSinceRef
    const wokeAt = wokeAtRef
    if (lastActivity.current === 0) lastActivity.current = Date.now() // entrar a la app cuenta como actividad

    const check = () => {
      if (sleepingSince.current === 0 && Date.now() - lastActivity.current >= idleMs) {
        sleepingSince.current = Date.now()
        setIdle(true)
      }
    }

    const onActivity = (event: Event) => {
      const now = Date.now()
      if (sleepingSince.current === 0) {
        // recién despierta: el clic que viene después de soltar no debe llegar a lo que quedó debajo
        if (event.type === 'click' && now - wokeAt.current < SCREENSAVER_CLICK_SWALLOW_MS) {
          event.stopPropagation()
          event.preventDefault()
          return
        }
        lastActivity.current = now
        return
      }
      // dormida: el teclado no despierta ni escribe en la pantalla de abajo
      if (event.type === 'keydown') {
        event.preventDefault()
        return
      }
      if (!WAKE_EVENTS.includes(event.type) || now - sleepingSince.current < WAKE_GRACE_MS) return
      sleepingSince.current = 0
      wokeAt.current = now
      lastActivity.current = now
      setIdle(false)
    }

    const timer = window.setInterval(check, CHECK_MS)
    // ojo: en captura, para tragarse teclas y clics antes de que lleguen a la pantalla de abajo
    SCREENSAVER_ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, true))
    return () => {
      window.clearInterval(timer)
      SCREENSAVER_ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity, true))
    }
  }, [idleMs])

  return idle
}
