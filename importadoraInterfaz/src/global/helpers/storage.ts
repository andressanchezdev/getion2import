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
    } catch (e) {
      console.warn('Error al guardar en localStorage:', e)
    }
    return Promise.resolve()
  },
  removeItem: (key: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key)
      }
    } catch (e) {
      console.warn('Error al remover de localStorage:', e)
    }
    return Promise.resolve()
  },
})

export const storage = createStorage()
export default storage
