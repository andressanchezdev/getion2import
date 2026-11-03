// useLocationForm · estado del formulario para crear o editar una ubicación: código, descripción, validación y guardado
// conecta con: LocationFormPanel (lo usa), useLocationActions (guardar) y navigation (cerrar el panel)
import { useState } from 'react'
import { closeDrawerForm } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { useLocationActions } from './useLocationActions'
import type { WarehouseLocation } from '../types/locations.types'

export const useLocationForm = (warehouseId: number, location?: WarehouseLocation) => {
  const dispatch = useAppDispatch()
  const actions = useLocationActions(warehouseId)
  const [code, setCode] = useState(location?.code ?? '')
  const [description, setDescription] = useState(location?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEdit = Boolean(location)

  // valida el código, guarda y cierra el panel si salió bien
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!code.trim()) {
      setError('El código de la ubicación es obligatorio.')
      return
    }
    setSaving(true)
    setError(null)
    const input = { code, description }
    const saved = location ? await actions.update(location.id, input) : await actions.create(input)
    setSaving(false)
    if (saved) dispatch(closeDrawerForm())
  }

  return { isEdit, code, setCode, description, setDescription, saving, error, submit }
}
