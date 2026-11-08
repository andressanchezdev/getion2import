// ConfirmPrompt · pide una confirmación (sin escribir nada) en el panel derecho cuando `open` pasa a true y avisa con onConfirm u onCancel
// conecta con: ReasonPrompt (el mismo formulario del panel sin el campo de texto); reemplaza a los diálogos flotantes de confirmación
// ojo: el padre debe poner open en false al confirmar o cancelar; el mensaje se toma al abrir
import React from 'react'
import { ReasonPrompt } from './ReasonPrompt'

interface ConfirmPromptProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmPrompt: React.FC<ConfirmPromptProps> = ({ onConfirm, ...rest }) => <ReasonPrompt {...rest} field={false} onConfirm={() => onConfirm()} />

export default ConfirmPrompt
