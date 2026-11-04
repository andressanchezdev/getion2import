// useCatalogItemForm · estado del formulario para crear o editar una marca, categoría o modelo: campos, validación y guardado
// conecta con: CatalogItemFormPanel (lo usa), catalogs.items.thunks (guardar), navigation (cerrar el panel) y toast
import { useState } from 'react'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { closeDrawerForm } from '@/features/navigation'
import { toast } from '@/global/helpers/feedback/toast'
import { saveCatalogItemThunk } from '../thunks/catalogs.items.thunks'
import { singularOf } from '../helpers/catalogs.labels'
import type { CatalogItemPayload } from '../types/catalogs.types'

// maneja los campos del formulario y lo guarda; al terminar cierra el panel
export const useCatalogItemForm = (payload: CatalogItemPayload) => {
  const dispatch = useAppDispatch()
  const isEdit = Boolean(payload.item)
  const [name, setName] = useState(payload.item?.name || '')
  const [image, setImage] = useState(payload.item?.image || '')
  const [description, setDescription] = useState(payload.item?.description || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // valida el nombre, guarda y avisa; si falla deja el mensaje en el formulario
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      const msg = `El nombre de ${payload.noun.slice(0, -1)} es obligatorio.`
      setError(msg)
      toast.warning('No se puede guardar', { description: msg })
      return
    }
    setSaving(true)
    setError(null)
    try {
      await dispatch(
        saveCatalogItemThunk({
          type: payload.type,
          id: payload.item?.id,
          name: name.trim(),
          imageUrl: image.trim() || undefined,
          description: description.trim() || undefined,
        })
      ).unwrap()
      toast.success(`${singularOf(payload.noun)} ${isEdit ? 'actualizada' : 'creada'} correctamente`)
      dispatch(closeDrawerForm())
    } catch (message) {
      setError(typeof message === 'string' ? message : 'Error al guardar el registro.')
    } finally {
      setSaving(false)
    }
  }

  return { isEdit, name, setName, image, setImage, description, setDescription, saving, error, submit }
}
