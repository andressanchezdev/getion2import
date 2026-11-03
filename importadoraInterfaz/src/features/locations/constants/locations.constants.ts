// locations.constants · estado inicial de ubicaciones
// conecta con: locations.slice (initialState)
import type { LocationsState } from '../types/locations.types'

export const INITIAL_LOCATIONS_STATE: LocationsState = {
  list: { warehouseId: 0, items: [], status: 'idle', error: null, saving: false, requestId: null },
  content: { key: '', items: [], status: 'idle', error: null },
}
