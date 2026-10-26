// reports.dates · fechas AAAA-MM-DD para los rangos de los reportes
// conecta con: reports.constants (rangos iniciales) y ReportRangeBar (límites de los campos de fecha)
// ojo: se usa la fecha LOCAL del navegador (no UTC), para que "hoy" no cambie de día a las 7 p. m. en Colombia

const pad = (value: number): string => String(value).padStart(2, '0')

export const toDayString = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const todayString = (now: Date = new Date()): string => toDayString(now)

export const daysAgoString = (days: number, now: Date = new Date()): string => {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days)
  return toDayString(date)
}

// un rango es válido si ambas fechas existen y el inicio no es posterior al fin
export const isValidRange = (start: string, end: string): boolean => Boolean(start) && Boolean(end) && start <= end
