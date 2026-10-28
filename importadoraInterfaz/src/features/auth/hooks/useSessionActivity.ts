// useSessionActivity · vigila la sesión mientras el usuario está dentro: cierra por inactividad y renueva el token en silencio
// conecta con: auth.thunks (logoutThunk y refreshSessionThunk), auth.token (vencimiento del JWT), auth.session (token guardado) y auth.session.constants (tiempos); lo monta ErpLayout
// ojo: solo se monta con sesión activa (ErpLayout no existe en el login); la inactividad y el vencimiento se calculan con la hora (Date.now), no sumando timers, porque los timers se frenan en pestañas dormidas
import { useEffect, useRef } from 'react'
import { useAppDispatch } from '@/global/hooks/useRedux'
import { toast } from '@/global/helpers/toast'
import { ACTIVITY_EVENTS, SESSION_TIMING, SESSION_WARNING_TOAST_ID } from '../constants/auth.session.constants'
import { LOGIN_MESSAGES } from '../constants/auth.constants'
import { getStoredAccessToken } from '../helpers/auth.session'
import { shouldRefreshToken } from '../helpers/auth.token'
import { logoutThunk, refreshSessionThunk } from '../thunks/auth.thunks'

export const useSessionActivity = (): void => {
  const dispatch = useAppDispatch()
  const lastActivity = useRef(0) // última vez que el usuario hizo algo (arranca al montar, abajo)
  const lastMark = useRef(0) // última vez que se anotó actividad (para no anotar más de 1 vez por segundo)
  const warned = useRef(false) // ya se mostró el aviso de cierre
  const refreshing = useRef(false) // hay una renovación en curso (evita lanzar dos a la vez)
  const retryAfter = useRef(0) // no reintentar la renovación antes de esta hora (tras un fallo de red)

  useEffect(() => {
    const { INACTIVITY_LIMIT_MS, WARNING_BEFORE_MS, REFRESH_MARGIN_MS, REFRESH_RETRY_MS, ACTIVITY_THROTTLE_MS, TICK_MS } =
      SESSION_TIMING
    let closed = false
    lastActivity.current = Date.now() // entrar a la app cuenta como actividad

    const dismissWarning = () => {
      if (!warned.current) return
      warned.current = false
      toast.dismiss(SESSION_WARNING_TOAST_ID)
    }

    // revisa el estado de la sesión: cierra por inactividad, avisa y renueva el token si ya toca
    const check = () => {
      if (closed) return
      const now = Date.now()
      const idle = now - lastActivity.current

      if (idle >= INACTIVITY_LIMIT_MS) {
        closed = true
        toast.dismiss(SESSION_WARNING_TOAST_ID)
        dispatch(logoutThunk('inactivity'))
        return
      }

      if (idle >= INACTIVITY_LIMIT_MS - WARNING_BEFORE_MS && !warned.current) {
        warned.current = true
        toast.warning(LOGIN_MESSAGES.warningTitle, {
          id: SESSION_WARNING_TOAST_ID,
          description: LOGIN_MESSAGES.warningDescription,
          duration: WARNING_BEFORE_MS,
        })
      }

      // renovación silenciosa: solo mientras hubo actividad (si no, ya se habría cerrado arriba)
      const token = getStoredAccessToken()
      if (token && !refreshing.current && now >= retryAfter.current && shouldRefreshToken(token, REFRESH_MARGIN_MS, now)) {
        refreshing.current = true
        dispatch(refreshSessionThunk())
          .unwrap()
          .then((renewed) => {
            if (!renewed) retryAfter.current = Date.now() + REFRESH_RETRY_MS
          })
          .catch(() => {
            retryAfter.current = Date.now() + REFRESH_RETRY_MS
          })
          .finally(() => {
            refreshing.current = false
          })
      }
    }

    // el usuario hizo algo: se anota (máximo 1 vez por segundo) y se quita el aviso
    // ojo: si ya había pasado 1 hora (por ejemplo el equipo estuvo dormido) esa actividad NO salva la sesión: se revisa y se cierra
    const onActivity = () => {
      const now = Date.now()
      if (now - lastMark.current < ACTIVITY_THROTTLE_MS) return
      lastMark.current = now
      if (now - lastActivity.current >= INACTIVITY_LIMIT_MS) return check()
      lastActivity.current = now
      dismissWarning()
    }

    // al volver a la pestaña se revisa de inmediato (mientras estuvo oculta los timers pudieron frenarse)
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }

    // si otra pestaña cerró la sesión (borró el token guardado), esta también se cierra
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && event.key === 'access_token' && event.newValue === null && !closed) {
        closed = true
        dispatch(logoutThunk('remote'))
      }
    }

    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, { passive: true }))
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)
    window.addEventListener('storage', onStorage)
    const timer = window.setInterval(check, TICK_MS)
    check() // revisión inicial: por ejemplo un token ya vencido al abrir la app

    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity))
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', check)
      window.removeEventListener('storage', onStorage)
      window.clearInterval(timer)
      toast.dismiss(SESSION_WARNING_TOAST_ID)
    }
  }, [dispatch])
}
