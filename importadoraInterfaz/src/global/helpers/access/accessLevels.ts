// accessLevels · nivel de cada usuario (superadmin, admin, empleado o cliente) y qué niveles pueden ver cada módulo o pantalla
// conecta con: usePermissions (aplica las reglas al menú, a la pantalla y a los botones), CompanySelector y AppHeader (qué controles se muestran)
// ojo: esto es solo el NIVEL (quién puede ver el componente); dentro de cada nivel los permisos finos (ver, crear, editar, anular) salen de la matriz de permisos
// ojo: los roles son etiquetas: el empleado puede tener cualquier permiso, incluso los de administración; por eso solo el cliente queda fuera de configuración y auditoría
// ojo: una clave sin regla la ven todos los niveles; para restringir otra pantalla basta una línea en SCREEN_LEVELS
export type ActorLevel = 'superadmin' | 'admin' | 'employee' | 'customer'

// el tipo de usuario que trae la API; cualquier otro valor se trata como cliente (el nivel más bajo)
export const getActorLevel = (userType: string | undefined | null): ActorLevel => {
  if (userType === 'superadmin' || userType === 'admin' || userType === 'employee') return userType
  return 'customer'
}

// todos menos el cliente: lo que antes era solo de administrador ahora lo decide la matriz de permisos (cualquier permiso se le puede dar a cualquier empleado)
const STAFF: ActorLevel[] = ['employee', 'admin', 'superadmin']

// «módulo» restringe todo el módulo; «módulo:pantalla» solo esa pantalla
export const SCREEN_LEVELS: Record<string, ActorLevel[]> = {
  settings: STAFF, // configuración del sistema (el empleado la ve solo si tiene el permiso)
  'reports:audit': STAFF, // auditoría de movimientos (idem)
  companySwitch: ['superadmin'], // salto entre compañías
  superadmin: ['superadmin'], // gestión superadmin: solo desarrolladores y administradores maestros globales
}

// nombre del menú para cada nivel cuando no es el mismo: el superadmin ve «Compañías» donde el administrador ve «Sedes»
const LEVEL_LABELS: Partial<Record<ActorLevel, Record<string, string>>> = {
  superadmin: { 'settings:warehouses': 'Compañías' },
}

// nombre del menú para el nivel del usuario; si no tiene uno propio usa el de siempre
export const labelForLevel = (level: ActorLevel, moduleKey: string, screenKey: string, fallback: string): string =>
  LEVEL_LABELS[level]?.[`${moduleKey}:${screenKey}`] ?? fallback

// dice si el nivel del usuario puede ver esa clave (módulo o pantalla)
export const levelAllows = (level: ActorLevel, key: string): boolean => {
  const allowed = SCREEN_LEVELS[key]
  return !allowed || allowed.includes(level)
}

// ¿este nivel puede ver el módulo y la pantalla? se revisan las dos claves
export const canLevelSee = (level: ActorLevel, moduleKey: string, screenKey?: string): boolean =>
  levelAllows(level, moduleKey) && (screenKey === undefined || levelAllows(level, `${moduleKey}:${screenKey}`))
