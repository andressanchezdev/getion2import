// CashShiftSlider · interruptor del turno de caja: izquierda = Abierta, derecha = Cerrada; se arrastra con mouse o dedo y se opera con el teclado
// conecta con: CashRegisterScreen (lo pinta) y useCashSession (pide abrir o cerrar); CashShiftSlider.css para el aspecto
// ojo: arrastrar a «Cerrada» NO cierra por sí solo: pide el arqueo (abre el panel) y el interruptor vuelve a «Abierta» hasta que el turno de verdad se cierre; lo mismo al revés con «Abrir»
import React, { useRef, useState } from 'react'
import './CashShiftSlider.css'

interface Props {
  isOpen: boolean // el turno está abierto: la perilla va a la izquierda
  loading: boolean // se está consultando o cambiando el turno
  disabled?: boolean
  disabledReason?: string
  onRequestOpen: () => void
  onRequestClose: () => void
}

const THRESHOLD = 0.5 // de la mitad del recorrido en adelante cuenta como «lo soltó a la derecha»
const MOVED = 0.1 // menos que esto es un clic, no un arrastre

export const CashShiftSlider: React.FC<Props> = ({ isOpen, loading, disabled = false, disabledReason, onRequestOpen, onRequestClose }) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const startRef = useRef(0)
  const [drag, setDrag] = useState<number | null>(null) // 0 = izquierda, 1 = derecha, mientras se arrastra
  const blocked = loading || disabled

  const request = () => (isOpen ? onRequestClose() : onRequestOpen())
  const position = drag ?? (isOpen ? 0 : 1)

  const ratioAt = (clientX: number) => {
    const box = trackRef.current?.getBoundingClientRect()
    if (!box || box.width === 0) return 0
    return Math.min(1, Math.max(0, (clientX - box.left) / box.width))
  }

  const onPointerDown = (event: React.PointerEvent) => {
    if (blocked) return
    event.currentTarget.setPointerCapture(event.pointerId)
    startRef.current = ratioAt(event.clientX)
    setDrag(startRef.current)
  }
  const onPointerMove = (event: React.PointerEvent) => {
    if (drag !== null) setDrag(ratioAt(event.clientX))
  }
  const onPointerUp = (event: React.PointerEvent) => {
    if (drag === null) return
    const end = ratioAt(event.clientX)
    setDrag(null)
    if (Math.abs(end - startRef.current) < MOVED) {
      request() // un clic sin arrastrar alterna
      return
    }
    // arrastró: lo que cuenta es de qué lado lo soltó
    if (isOpen && end >= THRESHOLD) onRequestClose()
    else if (!isOpen && end < THRESHOLD) onRequestOpen()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (blocked) return
    if (event.key === 'ArrowRight' && isOpen) onRequestClose()
    else if (event.key === 'ArrowLeft' && !isOpen) onRequestOpen()
    else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      request()
    }
  }

  return (
    <div className={`cash-slider ${blocked ? 'is-blocked' : ''}`} title={disabled ? disabledReason : isOpen ? 'Arrastra a «Cerrada» para hacer el arqueo' : 'Arrastra a «Abierta» para abrir el turno'}>
      <span className={`cash-slider-label ${isOpen ? 'is-on' : ''}`}>Abierta</span>
      <div
        ref={trackRef}
        className={`cash-slider-track ${isOpen ? 'is-open' : 'is-closed'}`}
        role="switch"
        aria-checked={isOpen}
        aria-label="Turno de caja"
        aria-busy={loading}
        aria-disabled={blocked}
        tabIndex={blocked ? -1 : 0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
      >
        <span className={`cash-slider-knob ${drag !== null ? 'is-dragging' : ''}`} style={{ left: `calc(${position * 100}% - ${position * 26}px + 2px)` }} />
      </div>
      <span className={`cash-slider-label ${!isOpen ? 'is-on' : ''}`}>Cerrada</span>
    </div>
  )
}

export default CashShiftSlider
