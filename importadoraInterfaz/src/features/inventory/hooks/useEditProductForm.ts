// useEditProductForm · estado del formulario de edición de un producto: campos, validación y guardado
// conecta con: EditProductPanel (lo usa), inventory.thunks (saveProductDetailsThunk), inventory.slice (actualiza la fila local), catalogs (categorías), navigation y toast
import { useState } from 'react'
import { closeDrawerForm } from '@/features/navigation'
import { selectBrands, selectCategories, selectMotoModels, useLoadCatalogs } from '@/features/catalogs'
import type { Product } from '@/features/shop'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { toast } from '@/global/helpers/feedback/toast'
import { updateProductLocally, updateProductStatusLocally } from '../slices/inventory.slice'
import { saveProductDetailsThunk } from '../thunks/inventory.thunks'

type ProductStatus = 'active' | 'inactive'

// maneja los campos del producto y lo guarda; al terminar actualiza la tabla y cierra el panel
export const useEditProductForm = (product: Product) => {
  const dispatch = useAppDispatch()
  useLoadCatalogs()
  const categories = useAppSelector(selectCategories)
  const brands = useAppSelector(selectBrands)
  const models = useAppSelector(selectMotoModels)

  // la categoría de partida: su id, o la que coincide por nombre
  const initialCategoryId =
    product.categoryId || categories.find((c) => c.name.toLowerCase() === (product.category || '').toLowerCase())?.id || ''

  const [name, setName] = useState(product.name || '')
  const [code, setCode] = useState(product.code || '')
  const [categoryId, setCategoryId] = useState<string | number>(initialCategoryId)
  // la marca y el modelo del producto llegan por nombre; se buscan en los catálogos para tener su id
  const [brandId, setBrandId] = useState(() => brands.find((b) => b.name.toLowerCase() === (product.brand || '').toLowerCase())?.id ?? 0)
  const [modelId, setModelId] = useState(() => models.find((m) => m.name.toLowerCase() === (product.modelCompatible || '').toLowerCase())?.id ?? 0)
  const [description, setDescription] = useState(product.description || '')
  const [isNew, setIsNew] = useState<boolean>(Boolean(product.isNew))
  const initialStatus: ProductStatus = product.status === 'inactive' ? 'inactive' : 'active'
  const [status, setStatus] = useState<ProductStatus>(initialStatus)
  const [iva, setIva] = useState<number>(product.iva ?? 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // valida el nombre, guarda en el servidor y refleja el cambio en la tabla
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('El nombre del producto no puede estar vacío.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const selectedCategory = categories.find((c) => String(c.id) === String(categoryId))
      const categoryIdNum = categoryId ? Number(categoryId) : undefined
      // ojo: un producto en borrador o descontinuado no se vuelve «activo» solo por guardar: el estado se envía únicamente si lo cambiaste
      const statusChanged = status !== initialStatus
      const fields = { name: name.trim(), code: code.trim(), description: description.trim(), isNew, iva, ...(statusChanged ? { status } : {}) }

      await dispatch(saveProductDetailsThunk({ id: product.id, updates: { ...fields, categoryId: categoryIdNum, brandId: brandId || undefined, modelId: modelId || undefined } })).unwrap()

      dispatch(updateProductLocally({ ...product, ...fields, category: selectedCategory ? selectedCategory.name : product.category, categoryId: categoryIdNum, brand: brands.find((b) => b.id === brandId)?.name ?? product.brand, modelCompatible: models.find((m) => m.id === modelId)?.name ?? product.modelCompatible }))
      if (statusChanged) dispatch(updateProductStatusLocally({ id: product.id, status }))
      toast.success('Producto guardado correctamente')
      dispatch(closeDrawerForm())
    } catch (message) {
      setError(typeof message === 'string' ? message : 'Error al actualizar el producto.')
    } finally {
      setSaving(false)
    }
  }

  return { categories, brands, models, brandId, setBrandId, modelId, setModelId, name, setName, code, setCode, categoryId, setCategoryId, description, setDescription, isNew, setIsNew, status, setStatus, iva, setIva, saving, error, submit }
}
