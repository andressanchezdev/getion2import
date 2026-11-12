// recyclebin.realtime · la papelera en tiempo real: entity.archived y entity.restored avisan a la pantalla abierta
// conecta con: useRecycleBin (se suscribe y vuelve a pedir su página) y realtimeRegistry
// ojo: la lista de la papelera vive en el hook (no en el store) y sus filas no viajan en el evento, así que la pantalla abierta se vuelve a pedir una vez
import type { RealtimeHandlers } from '@/features/realtime'

type Listener = () => void
const listeners = new Set<Listener>()

// la pantalla de papelera se apunta mientras está abierta; devuelve cómo darse de baja
export const onRecycleBinChanged = (listener: Listener): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const notifyRecycleBinChanged = (): void => {
  for (const listener of listeners) listener()
}

export const recycleBinRealtimeHandlers: RealtimeHandlers = {
  'entity.archived': [() => notifyRecycleBinChanged()],
  'entity.restored': [() => notifyRecycleBinChanged()],
}
