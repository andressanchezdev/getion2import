// useVerticalDrag · deja arrastrar un elemento fijo solo hacia arriba y abajo (con el mouse, el dedo o las flechas del teclado) y recuerda dónde quedó
// conecta con: DrawerTab (pestaña del carrito contraído); devuelve la posición (px desde arriba), la referencia del elemento y los manejadores de eventos
// ojo: un movimiento menor a DRAG_THRESHOLD cuenta como clic (abre el carrito); si fue un arrastre, se anula el clic que viene justo después
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, MouseEvent } from 'react'

export const DRAG_THRESHOLD = 5 // px que hay que mover para que cuente como arrastre y no como clic
export const KEY_STEP = 24 // px que se mueve con cada flecha
const EDGE_MARGIN = 8 // separación mínima con el borde de arriba y de abajo

// deja la posición dentro de la pantalla (nunca se sale por arriba ni por abajo)
export const clampTop = (top: number, size: number, viewport: number): number =>
  Math.min(Math.max(top, EDGE_MARGIN), Math.max(EDGE_MARGIN, viewport - size - EDGE_MARGIN))

const readStored = (key: string): number | null => {
  try {
    const value = Number(window.localStorage.getItem(key))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null // sin localStorage (modo privado o bloqueado): se usa la posición por defecto
  }
}

const writeStored = (key: string, top: number): void => {
  try {
    window.localStorage.setItem(key, String(Math.round(top)))
  } catch {
    /* sin localStorage: la posición solo dura mientras la página esté abierta */
  }
}

export const useVerticalDrag = (storageKey: string) => {
  const ref = useRef<HTMLButtonElement>(null)
  const [top, setTop] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const drag = useRef({ active: false, moved: false, startY: 0, startTop: 0, lastTop: 0 })
  const suppressClick = useRef(false)

  const place = useCallback((value: number) => {
    const size = ref.current?.offsetHeight ?? 0
    const next = clampTop(value, size, window.innerHeight)
    setTop(next)
    return next
  }, [])

  // posición inicial: la guardada, o el centro de la pantalla; y se reajusta si la ventana cambia de alto
  useLayoutEffect(() => {
    const size = ref.current?.offsetHeight ?? 0
    place(readStored(storageKey) ?? (window.innerHeight - size) / 2)
  }, [place, storageKey])
  useEffect(() => {
    const onResize = () => setTop((current) => (current === null ? current : clampTop(current, ref.current?.offsetHeight ?? 0, window.innerHeight)))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const startTop = top ?? event.currentTarget.getBoundingClientRect().top
    drag.current = { active: true, moved: false, startY: event.clientY, startTop, lastTop: startTop }
  }

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const state = drag.current
    if (!state.active) return
    const delta = event.clientY - state.startY
    if (!state.moved && Math.abs(delta) < DRAG_THRESHOLD) return
    state.moved = true
    setIsDragging(true)
    state.lastTop = place(state.startTop + delta)
  }

  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const state = drag.current
    if (!state.active) return
    state.active = false
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    setIsDragging(false)
    if (state.moved) {
      suppressClick.current = true // el clic que sigue al arrastre no debe abrir el carrito
      writeStored(storageKey, state.lastTop)
    }
  }

  const onClickCapture = (event: MouseEvent<HTMLButtonElement>) => {
    if (!suppressClick.current) return
    suppressClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  // con el teclado: flecha arriba o abajo mueve la pestaña
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    const next = place((top ?? 0) + (event.key === 'ArrowUp' ? -KEY_STEP : KEY_STEP))
    writeStored(storageKey, next)
  }

  return { ref, top, isDragging, handlers: { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, onClickCapture, onKeyDown } }
}
