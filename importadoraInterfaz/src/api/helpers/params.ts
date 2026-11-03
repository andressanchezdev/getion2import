// params · arma los parámetros de consulta (query string) de los listados de la API en Go
// conecta con: api/index (se exporta) y los services de cada feature (los pasan a apiClient.get como { params })
// ojo: la API toma la compañía del token; solo se manda companyId cuando existe (el superadmin no tiene compañía)
// ojo: los valores vacíos (undefined, null, '') no viajan: así un filtro sin usar no se escribe en la URL

type QueryValue = string | number | boolean | null | undefined

// quita los valores vacíos de un objeto de parámetros
export const compactParams = (params: Record<string, QueryValue>): Record<string, string | number | boolean> =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')) as Record<
    string,
    string | number | boolean
  >

// parámetros de un listado: companyId (si existe) + los demás filtros
export const withCompany = (companyId: number | undefined, extra: Record<string, QueryValue> = {}) =>
  compactParams({ companyId: companyId || undefined, ...extra })
