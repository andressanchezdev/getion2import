// useAssignStockForm · estado y guardado del formulario «Asignar producto a una ubicación»: buscar un producto del catálogo, elegir ubicación y unidades
// conecta con: AssignStockPanel (lo usa), inventory.thunks (searchCatalogThunk y assignStockThunk), locations (useLocations: las ubicaciones activas de la bodega) y navigation (cierra el panel)
// ojo: la cantidad debe ser un entero de al menos 1; la bodega es la activa; al guardar avisa por onDone para que la tabla se recargue
import { useEffect, useState } from 'react'
import { useLocations } from '@/features/locations'
import { closeDrawerForm } from '@/features/navigation'
import type { Product } from '@/features/shop'
import { toast } from '@/global/helpers/feedback/toast'
import { useDebouncedValue } from '@/global/hooks/data/useDebouncedValue'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { assignStockThunk, searchCatalogThunk } from '../thunks/inventory.thunks'

export interface AssignStockPayload {
  onDone?: () => void
}

export const useAssignStockForm = (onDone?: () => void) => {
  const dispatch = useAppDispatch()
  const locations = useLocations()
  const [text, setText] = useState('')
  const [found, setFound] = useState<{ query: string; items: Product[] }>({ query: '', items: [] })
  const [product, setProduct] = useState<Product | null>(null)
  const [location, setLocation] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const query = useDebouncedValue(text, 350)

  const needle = query.trim()
  const canSearch = needle.length >= 2 && !product

  useEffect(() => {
    if (!canSearch) return
    let current = true
    dispatch(searchCatalogThunk(needle))
      .unwrap()
      .then((items) => current && setFound({ query: needle, items }))
      .catch(() => current && setFound({ query: needle, items: [] }))
    return () => {
      current = false
    }
  }, [dispatch, needle, canSearch])

  // ojo: los resultados solo se ven si son de la búsqueda actual y no hay producto elegido; mientras llegan se muestra «Buscando…»
  const visibleResults = canSearch && found.query === needle ? found.items : []
  const searching = canSearch && found.query !== needle
  const amount = Number(quantity)
  const valid = Boolean(product) && location !== '' && Number.isInteger(amount) && amount >= 1

  const pick = (selected: Product | null) => {
    setProduct(selected)
    setText(selected ? `${selected.code} · ${selected.name}` : '')
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!valid || !product || saving) return
    setSaving(true)
    setError(null)
    const result = await dispatch(assignStockThunk({ productId: Number(product.id), warehouseId: locations.warehouseId, location, quantity: amount }))
    setSaving(false)
    if (assignStockThunk.fulfilled.match(result)) {
      toast.success(`${product.code} asignado a ${location}`)
      onDone?.()
      dispatch(closeDrawerForm())
    } else {
      setError(result.payload ?? 'No se pudo asignar el producto.')
    }
  }

  return {
    warehouseName: locations.warehouseName,
    text,
    setText: (value: string) => {
      setProduct(null)
      setText(value)
    },
    results: visibleResults,
    searching,
    product,
    pick,
    location,
    setLocation,
    locationOptions: locations.items.filter((item) => item.isActive),
    quantity,
    setQuantity,
    valid,
    saving,
    error,
    submit,
    cancel: () => dispatch(closeDrawerForm()),
  }
}
