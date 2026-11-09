// columnWidths · guarda y lee el ancho de las columnas de cada tabla (por tabla y por usuario) en el navegador
// conecta con: useColumnResize (lo usa al arrastrar y al abrir la tabla); con pruebas en columnWidths.test.ts
// ojo: solo se guardan los anchos si coinciden en cantidad con las columnas actuales; si la tabla cambió de columnas se ignoran; si el navegador no deja guardar, la tabla se ve normal
export const MIN_COLUMN_WIDTH = 64

export const columnWidthsKey = (userId: string | number | undefined, tableId: string): string => `ip.colw.${userId ?? 'anon'}.${tableId}`

// los anchos guardados, o null si no hay o ya no coinciden con las columnas
export const readColumnWidths = (key: string, columnCount: number): number[] | null => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length !== columnCount) return null
    const widths = parsed.map((value) => Number(value))
    return widths.every((width) => Number.isFinite(width) && width >= MIN_COLUMN_WIDTH) ? widths : null
  } catch {
    return null
  }
}

export const writeColumnWidths = (key: string, widths: number[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(widths.map((width) => Math.round(width))))
  } catch {
    // sin espacio o bloqueado: el ancho solo dura mientras la tabla está abierta
  }
}

export const clearColumnWidths = (key: string): void => {
  try {
    localStorage.removeItem(key)
  } catch {
    // nada que borrar
  }
}

// ancho nuevo de una columna al arrastrar: nunca menor al mínimo
export const clampColumnWidth = (startWidth: number, delta: number): number => Math.max(MIN_COLUMN_WIDTH, Math.round(startWidth + delta))

// reparte el cambio de ancho entre dos columnas para que el total no cambie: la tabla siempre llena su espacio, la primera y la última quedan pegadas a sus bordes
// la columna vecina que compensa es la siguiente si no es la última; si no, la anterior; nunca baja del mínimo ni de ella ni de la vecina
export const resizeColumns = (startWidths: number[], index: number, delta: number, min: number = MIN_COLUMN_WIDTH): number[] => {
  const last = startWidths.length - 1
  if (startWidths.length < 2 || index < 0 || index > last) return startWidths
  // compensa la siguiente si no es la última; si no, la anterior (con solo dos columnas, la otra)
  const neighbor = index + 1 < last ? index + 1 : index > 0 ? index - 1 : index + 1
  const maxGrow = startWidths[neighbor] - min
  const maxShrink = startWidths[index] - min
  const applied = Math.max(-maxShrink, Math.min(maxGrow, delta))
  const widths = [...startWidths]
  widths[index] = Math.round(startWidths[index] + applied)
  widths[neighbor] = Math.round(startWidths[neighbor] - applied)
  return widths
}

// ancho de cada columna como porcentaje del total, para que la tabla siga llenando su espacio si cambia el tamaño de la ventana
export const toPercentages = (widths: number[]): number[] => {
  const total = widths.reduce((sum, width) => sum + width, 0)
  return widths.map((width) => (width / total) * 100)
}
