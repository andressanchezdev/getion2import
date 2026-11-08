// ReasonPrompt · pide un motivo (o nota) en el panel derecho cuando `open` pasa a true y avisa con onConfirm(texto) u onCancel
// conecta con: useReasonPrompt (abre el formulario ReasonFormPanel en el panel derecho); lo usan las tablas y pantallas que desactivan, anulan o restauran
// ojo: no pinta nada por sí mismo (el formulario vive en el panel derecho, no en una ventana flotante); el padre debe poner open en false al confirmar o cancelar
import { useEffect, useRef } from 'react'
import { useReasonPrompt } from '../hooks/useReasonPrompt'
import type { ReasonPromptOptions } from '../types/reasonPrompt.types'

interface ReasonPromptProps extends ReasonPromptOptions {
  open: boolean
  onConfirm: (reason: string) => void
  onCancel: () => void
}

export const ReasonPrompt = ({ open, onConfirm, onCancel, title, message, confirmLabel, fieldLabel, placeholder, minLength, maxLength }: ReasonPromptProps): null => {
  const askReason = useReasonPrompt()
  const handlers = useRef({ onConfirm, onCancel })

  // se actualiza en un efecto (no al pintar) para que la respuesta llame siempre a los manejadores más recientes
  useEffect(() => {
    handlers.current = { onConfirm, onCancel }
  })

  useEffect(() => {
    if (!open) return
    let ignored = false
    void askReason({ title, message, confirmLabel, fieldLabel, placeholder, minLength, maxLength }).then((reason) => {
      if (ignored) return
      if (reason === null) handlers.current.onCancel()
      else handlers.current.onConfirm(reason)
    })
    return () => {
      ignored = true
    }
    // ojo: solo se vuelve a pedir cuando cambia open; el texto del mensaje se toma al abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return null
}

export default ReasonPrompt
