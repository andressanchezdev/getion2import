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
