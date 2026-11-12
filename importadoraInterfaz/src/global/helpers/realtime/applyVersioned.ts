// applyVersioned · aplica un cambio solo si su versión (ISO updated_at) es más nueva que la guardada (sección 16.5)
// conecta con: todos los reducers *FromEvent y las cargas de listas (sección 16.9)

export const isNewer = (incoming?: string | null, current?: string | null): boolean => {
  if (!current) return true
  if (!incoming) return false

  const inMs = Date.parse(incoming)
  const curMs = Date.parse(current)

  if (!Number.isNaN(inMs) && !Number.isNaN(curMs)) {
    if (inMs !== curMs) return inMs > curMs
    // Si empatan al milisegundo (ISO con microsegundos), el orden lexicográfico UTC decide
    return incoming > current
  }

  return incoming > current
}

export const applyVersioned = <T extends { updatedAt?: string | null; version?: string | null }>(
  current: T | undefined | null,
  incoming: T,
  incomingVersion?: string | null
): T => {
  if (!current) return incoming
  const curVer = current.updatedAt ?? current.version ?? null
  const incVer = incomingVersion ?? incoming.updatedAt ?? incoming.version ?? null
  return isNewer(incVer, curVer) ? incoming : current
}

// applyVersionedStatus · cambia isActive de una fila solo si la versión del evento es más nueva que la anotada; anota la versión (16.5)
export const applyVersionedStatus = (row: object, isActive: boolean, version?: string | null): boolean => {
  const target = row as { isActive?: boolean; updatedAt?: string | null }
  if (!isNewer(version, target.updatedAt)) return false
  target.isActive = isActive
  if (version) target.updatedAt = version
  return true
}

// mergeVersionedList · una carga HTTP tardía no pisa una fila más nueva ya aplicada por evento (16.9); sin versión en ambos lados gana la carga
export const mergeVersionedList = <T extends object>(current: readonly T[], incoming: T[], key: (row: T) => unknown): T[] => {
  const byKey = new Map(current.map((row) => [key(row), row]))
  return incoming.map((row) => {
    const prev = byKey.get(key(row))
    const prevVer = (prev as { updatedAt?: string | null } | undefined)?.updatedAt
    const nextVer = (row as { updatedAt?: string | null }).updatedAt
    return prev && prevVer && nextVer && !isNewer(nextVer, prevVer) ? prev : row
  })
}
