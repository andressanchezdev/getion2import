// superadmin.selectors · lecturas simples del estado de la gestión de administradores
// conecta con: useSuperadminAdmins; leen state.superadmin
import type { SuperadminState } from '../types/superadmin.types'

// forma mínima del state que necesitan estos selectors (así la feature no importa el store de app)
type SuperadminRoot = { superadmin: SuperadminState }

export const selectSuperadmin = (state: SuperadminRoot) => state.superadmin
// dice si hay algún filtro puesto (texto, empresa o estado)
export const selectHasAdminFilters = (state: SuperadminRoot) => {
  const { query, companyId, status } = state.superadmin.filters
  return Boolean(query || companyId !== null || status !== 'all')
}
