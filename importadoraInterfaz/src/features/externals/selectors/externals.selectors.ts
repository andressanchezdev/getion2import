// externals.selectors · lecturas de proveedores y transportadoras: lista, estado de carga y si hay un cambio en curso
// conecta con: useExternals y los hooks de externals; leen state.externals
import type { ExternalsState } from '../types/externals.types'

// forma mínima del state (así la feature no importa el store de app)
type ExternalsRootState = { externals: ExternalsState }

// lee la lista con su tipo, estado de carga y error
export const selectExternals = (state: ExternalsRootState) => state.externals
// dice si hay un cambio en curso (guardar, cambiar el estado o borrar)
export const selectExternalsSaving = (state: ExternalsRootState) => state.externals.saving
