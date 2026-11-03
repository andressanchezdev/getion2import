// audit.format · cómo se escribe la fecha de un movimiento en pantalla
// conecta con: AuditTable y AuditDetailModal
export const formatAuditDate = (iso: string): string => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}
