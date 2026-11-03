// locations.selectors · lecturas de ubicaciones: la lista de la bodega abierta y el contenido de la ubicación seleccionada
// conecta con: LocationsScreen, LocationDetailPanel y los hooks de ubicaciones; leen state.locations
import type { LocationsState } from '../types/locations.types'

// forma mínima del state (así la feature no importa el store de app)
type LocationsRootState = { locations: LocationsState }

// lee la lista de ubicaciones con su estado de carga
export const selectLocationsList = (state: LocationsRootState) => state.locations.list
// lee el contenido de la ubicación seleccionada con su estado de carga
export const selectLocationContent = (state: LocationsRootState) => state.locations.content
