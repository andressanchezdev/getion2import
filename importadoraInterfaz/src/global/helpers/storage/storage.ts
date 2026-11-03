// storage · almacenamiento seguro (localStorage) para redux-persist
// conecta con: app/store/store
/**
 * Motor de almacenamiento seguro para Redux Persist y navegador.
 * Compatible con Vite (ESM), SSR y modo incógnito.
 */
export const createStorage = () => ({
  getItem: (key: string): Promise<string | null> => {
    try {
      return Promise.resolve(typeof window !== 'undefined' ? localStorage.getItem(key) : null)
    } catch {
      return Promise.resolve(null)
    }
  },
  setItem: (key: string, value: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value)
      }
    } catch {
      // ojo: almacenamiento lleno o bloqueado (modo privado); la sesión sigue en memoria
    }
    return Promise.resolve()
  },
  removeItem: (key: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key)
      }
    } catch {
      // ojo: almacenamiento bloqueado; no hay nada que quitar
    }
    return Promise.resolve()
  },
})

export const storage = createStorage()
export default storage
