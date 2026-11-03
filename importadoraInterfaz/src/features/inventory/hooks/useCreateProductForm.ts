// useCreateProductForm · estado del formulario de nuevo producto: datos, categoría, marca, modelo, tarifas y ubicación inicial, con validación y guardado
// conecta con: CreateProductForm (lo usa), catalogs (marcas, categorías y modelos), locations (ubicaciones de la bodega elegida), inventory.thunks (crear y recargar la tabla) y navigation (cerrar el panel o abrir el QR)
// ojo: un producto puede quedar en VARIAS ubicaciones de la misma bodega (cada una con sus unidades); al crear con ubicaciones el panel pasa a las etiquetas QR (una por ubicación, para pegar en cada estante); sin ubicación se cierra
import { useState } from 'react'
import { closeDrawerForm, openDrawerForm } from '@/features/navigation'
import { selectBrands, selectCategories, selectMotoModels, useLoadCatalogs } from '@/features/catalogs'
import { productLabel, useLocations } from '@/features/locations'
import { useWarehouses } from '@/features/warehouses'
import type { ProductPrices } from '@/features/shop'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { toast } from '@/global/helpers/feedback/toast'
import { createProductThunk, loadProductsTableThunk } from '../thunks/inventory.thunks'

const EMPTY_PRICES: ProductPrices = { p0: 0, p1: 0, p2: 0, p3: 0 }

export const useCreateProductForm = () => {
  const dispatch = useAppDispatch()
  useLoadCatalogs()
  const brands = useAppSelector(selectBrands)
  const categories = useAppSelector(selectCategories)
  const models = useAppSelector(selectMotoModels)
  const { warehouses } = useWarehouses() // la lista de bodegas para elegir dónde queda guardado (la pide si todavía no está)
  const activeWarehouseId = useAppSelector((state) => state.ui.activeWarehouseId)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState(0)
  const [brandId, setBrandId] = useState(0)
  const [modelId, setModelId] = useState(0)
  const [compatibleModelIds, setCompatibleModelIds] = useState<number[]>([])
  const [unit, setUnit] = useState('UND')
  const [lastCost, setLastCost] = useState(0)
  const [prices, setPrices] = useState<ProductPrices>(EMPTY_PRICES)
  const [isNew, setIsNew] = useState(false)
  const [warehouseId, setWarehouseId] = useState(activeWarehouseId ? Number(activeWarehouseId) : 0)
  // una fila por ubicación donde queda guardado el producto: dónde (código) y cuántas unidades
  const [places, setPlaces] = useState<Array<{ location: string; quantity: number }>>([{ location: '', quantity: 0 }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const locations = useLocations(warehouseId || undefined)
  const activeLocations = locations.items.filter((item) => item.isActive)

  // anota el precio de una tarifa (solo dígitos, nunca negativo)
  const setPrice = (tier: keyof ProductPrices, digits: string) => setPrices((current) => ({ ...current, [tier]: Math.max(0, Number(digits.replace(/\D/g, '')) || 0) }))

  // agrega una fila para otra ubicación del mismo producto
  const addPlace = () => setPlaces((current) => [...current, { location: '', quantity: 0 }])
  // quita una fila (siempre queda al menos una)
  const removePlace = (index: number) => setPlaces((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : current))
  // cambia la ubicación o las unidades de una fila
  const changePlace = (index: number, change: Partial<{ location: string; quantity: number }>) => setPlaces((current) => current.map((place, i) => (i === index ? { ...place, ...change } : place)))

  const toggleCompatibleModel = (id: number) => {
    setCompatibleModelIds((current) =>
      current.includes(id) ? current.filter((mId) => mId !== id) : [...current, id]
    )
  }

  // valida y crea el producto; con ubicación abre las etiquetas QR, sin ella cierra el panel
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!code.trim() || !name.trim()) return setError('El código y el nombre del producto son obligatorios.')
    if (!categoryId) return setError('Elige la categoría del producto.')
    const chosen = places.filter((place) => place.location)
    if (chosen.length > 0 && !warehouseId) return setError('Elige la bodega donde queda guardado.')
    if (new Set(chosen.map((place) => place.location)).size !== chosen.length) return setError('Una ubicación está repetida: cada una se elige una sola vez.')
    setSaving(true)
    setError(null)
    try {
      const compModelNames = models.filter((m) => compatibleModelIds.includes(m.id)).map((m) => m.name)
      const fullDescription = compModelNames.length > 0
        ? `${description.trim()}\nModelos compatibles: ${compModelNames.join(', ')}`.trim()
        : description.trim()

      const created = await dispatch(
        createProductThunk({
          code,
          name,
          description: fullDescription || undefined,
          categoryId,
          brandId: brandId || undefined,
          modelId: modelId || undefined,
          unit,
          lastCost: lastCost || undefined,
          prices,
          isNew,
          status: 'active',
          initialStock: chosen.length > 0 ? chosen.map((place) => ({ warehouseId, location: place.location, quantity: place.quantity })) : undefined,
        })
      ).unwrap()
      toast.success(`Producto ${created.code} creado`)
      dispatch(loadProductsTableThunk({ page: 1, query: '' }))
      if (chosen.length > 0) {
        const warehouseName = warehouses.find((warehouse) => Number(warehouse.id) === warehouseId)?.name ?? ''
        const labels = chosen.map((place) => productLabel(warehouseId, place.location, created.code, created.name, warehouseName))
        dispatch(openDrawerForm({ kind: 'qrLabels', payload: { heading: labels.length > 1 ? `Etiquetas de ${created.code}` : `Etiqueta de ${created.code}`, labels } }))
      } else {
        dispatch(closeDrawerForm())
      }
    } catch (message) {
      setError(typeof message === 'string' ? message : 'No se pudo crear el producto.')
    } finally {
      setSaving(false)
    }
  }

  return {
    brands,
    categories,
    models,
    warehouses,
    activeLocations,
    code, setCode, name, setName, description, setDescription,
    categoryId, setCategoryId, brandId, setBrandId, modelId, setModelId,
    compatibleModelIds, toggleCompatibleModel,
    unit, setUnit, lastCost, setLastCost, prices, setPrice, isNew, setIsNew,
    warehouseId, setWarehouseId: (id: number) => { setWarehouseId(id); setPlaces([{ location: '', quantity: 0 }]) },
    places, addPlace, removePlace, changePlace,
    saving, error, submit,
  }
}
