// audit/index · API pública de la feature auditoría (movimientos de solo lectura para admin y superadmin)
// conecta con: screenRegistry (AuditScreen)
export * from './types/audit.types'
export { AuditScreen } from './screens/AuditScreen'
export * from './hooks/useOpenHistory'
export * from './components/AuditDetailPanel'
export * from './slices/audit.slice'
