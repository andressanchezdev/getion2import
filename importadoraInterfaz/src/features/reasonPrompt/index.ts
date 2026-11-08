// reasonPrompt/index.ts · API pública del motivo en el panel derecho (componente, hook, formulario, constantes y tipos)
// conecta con: formRegistry (ReasonFormPanel) y las pantallas que piden motivo (ReasonPrompt)
export * from './types/reasonPrompt.types'
export * from './constants/reasonPrompt.constants'
export * from './hooks/useReasonPrompt'
export { ReasonPrompt } from './components/ReasonPrompt'
export { ConfirmPrompt } from './components/ConfirmPrompt'
export { ReasonFormPanel } from './components/ReasonFormPanel'
