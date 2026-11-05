// useWarehouseLocations · pide las ubicaciones de una bodega y las vuelve a pedir al cambiar de bodega o al llamar reload
// conecta con: WarehouseLocationsManagement; despacha locations.thunks (loadLocationsThunk)
// ojo: «cargando» se deduce de que lo guardado sea de otra bodega (así no hay setState síncrono en el efecto); si falla se muestra la lista vacía
import { useCallback, useEffect, useState } from 'react'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { loadLocationsThunk, type WarehouseLocation } from '@/features/locations'

interface Loaded {
  warehouseId: number
  items: WarehouseLocation[]
}

export const useWarehouseLocations = (warehouseId: number) => {
  const dispatch = useAppDispatch()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!warehouseId) return
    let cancelled = false
    dispatch(loadLocationsThunk(warehouseId))
      .unwrap()
      .then((items) => !cancelled && setLoaded({ warehouseId, items }))
      .catch(() => !cancelled && setLoaded({ warehouseId, items: [] }))
    return () => {
      cancelled = true
    }
  }, [dispatch, warehouseId, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const locations = loaded?.warehouseId === warehouseId ? loaded.items : []
  return { locations, loading: Boolean(warehouseId) && loaded?.warehouseId !== warehouseId, reload }
}
