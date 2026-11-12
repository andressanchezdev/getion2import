// useEmployeePermissions · carga los permisos de un empleado como borrador (mapa módulo -> permisos + acciones especiales) y los guarda; lo usa el panel de permisos de un empleado
// conecta con: employees.thunks (cargar y guardar), permissions.selection (emptyModule) y employees.assignable.constants (módulos asignables)
// ojo: el mapa es el borrador que se edita en el panel (estado local de formulario); los módulos que el empleado no tiene quedan en blanco (sin acceso)
import { useCallback, useEffect, useState } from 'react'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { ASSIGNABLE_MENU_ITEMS } from '../constants/employees.assignable.constants'
import { emptyModule, type PermissionsMap } from '../helpers/permissions.selection'
import { loadEmployeePermissionsThunk, saveEmployeePermissionsThunk } from '../thunks/employees.thunks'

export const useEmployeePermissions = (employeeId: number) => {
  const dispatch = useAppDispatch()
  const [map, setMap] = useState<PermissionsMap>({})
  const [specials, setSpecials] = useState<string[]>([]) // acciones especiales marcadas
  const [loading, setLoading] = useState(Boolean(employeeId))
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    if (!employeeId) return
    let cancelled = false
    dispatch(loadEmployeePermissionsThunk(employeeId)).then((result) => {
      if (cancelled) return
      if (loadEmployeePermissionsThunk.fulfilled.match(result)) {
        const next: PermissionsMap = {}
        ASSIGNABLE_MENU_ITEMS.forEach((item) => {
          const found = result.payload.modules?.find((module) => module.moduleKey === item.id)
          next[item.id] = found ? { ...emptyModule(item), ...found } : emptyModule(item)
        })
        setMap(next)
        setSpecials(result.payload.specials ?? [])
      } else {
        setFeedback({ type: 'error', msg: result.payload ?? 'Error al cargar permisos del empleado' })
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [dispatch, employeeId])

  const save = useCallback(async (): Promise<boolean> => {
    if (!employeeId) return false
    setSaving(true)
    setFeedback(null)
    const result = await dispatch(saveEmployeePermissionsThunk({ employeeId, modules: Object.values(map), specials }))
    setSaving(false)
    if (saveEmployeePermissionsThunk.fulfilled.match(result)) {
      setFeedback({ type: 'success', msg: 'Permisos actualizados con éxito.' })
      return true
    }
    setFeedback({ type: 'error', msg: result.payload ?? 'Error al guardar permisos' })
    return false
  }, [dispatch, employeeId, map, specials])

  return { map, setMap, specials, setSpecials, loading, saving, feedback, save }
}
