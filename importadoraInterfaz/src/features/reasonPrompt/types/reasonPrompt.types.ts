// reasonPrompt.types.ts · tipos del formulario de motivo (o nota) que se abre en el panel derecho
export interface ReasonPromptOptions {
  title: string
  message: string
  confirmLabel?: string
  fieldLabel?: string // por defecto «Motivo»
  placeholder?: string
  minLength?: number // por defecto 10; con 0 el campo es opcional
  maxLength?: number // por defecto 100
  field?: boolean // false = solo confirmar, sin campo de texto (por defecto true)
}

// lo que viaja al panel por el estado de navegación (solo datos serializables: el resultado se devuelve por requestId)
export interface ReasonFormPayload extends ReasonPromptOptions {
  requestId: string
}
