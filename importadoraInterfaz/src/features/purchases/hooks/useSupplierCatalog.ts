// useSupplierCatalog · catálogo de un proveedor: lo que él nos vende (producto, su código y costo); buscar un producto nuestro, agregarlo con su costo, cambiarlo o quitarlo
// conecta con: SupplierCatalogPanel (lo usa), purchases.thunks (cargar, guardar y quitar) e inventory (searchCatalogThunk: buscar entre nuestros productos)
// ojo: agregar un producto que ya estaba solo cambia su costo y código; el costo es obligatorio; la orden de compra solo ofrece estos productos
import { useEffect, useState } from 'react'
import { searchCatalogThunk } from '@/features/inventory'
import type { Product } from '@/features/shop'
import { toast } from '@/global/helpers/feedback/toast'
import { useDebouncedValue } from '@/global/hooks/data/useDebouncedValue'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { deleteSupplierProductThunk, loadSupplierProductsThunk, saveSupplierProductThunk } from '../thunks/purchases.thunks'
import type { SupplierProduct } from '../types/purchases.types'

export const useSupplierCatalog = (supplierId: number) => {
  const dispatch = useAppDispatch()
  const [items, setItems] = useState<SupplierProduct[] | null>(null)
  // tiempo real: si otro usuario importa el catálogo de este proveedor, se vuelve a pedir la lista
  const importTick = useAppSelector((state) => (state as { purchases?: { catalogTicks?: Record<number, number> } }).purchases?.catalogTicks?.[supplierId] ?? 0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [found, setFound] = useState<{ query: string; items: Product[] }>({ query: '', items: [] })
  const [selected, setSelected] = useState<Product | null>(null)
  const [cost, setCost] = useState('')
  const [supplierCode, setSupplierCode] = useState('')
  const [saving, setSaving] = useState(false)
  const query = useDebouncedValue(text, 350)
  const needle = query.trim()
  const canSearch = needle.length >= 2 && selected === null

  useEffect(() => {
    let current = true
    dispatch(loadSupplierProductsThunk(supplierId))
      .unwrap()
      .then((list) => current && setItems(list))
      .catch((reason) => current && setLoadError(String(reason)))
    return () => {
      current = false
    }
  }, [dispatch, supplierId, importTick])

  useEffect(() => {
    if (!canSearch) return
    let current = true
    dispatch(searchCatalogThunk(needle))
      .unwrap()
      .then((list) => current && setFound({ query: needle, items: list }))
      .catch(() => current && setFound({ query: needle, items: [] }))
    return () => {
      current = false
    }
  }, [dispatch, needle, canSearch])

  const results = canSearch && found.query === needle ? found.items.slice(0, 6) : []

  const choose = (product: Product) => {
    const existing = (items ?? []).find((item) => item.productId === Number(product.id))
    setSelected(product)
    setCost(existing ? String(existing.cost) : '')
    setSupplierCode(existing?.supplierCode ?? '')
    setText('')
  }
  const clearSelection = () => {
    setSelected(null)
    setCost('')
    setSupplierCode('')
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selected || saving) return
    const value = Number(cost)
    if (!(value >= 0) || cost === '') {
      toast.warning('Escribe el costo que cobra el proveedor.')
      return
    }
    setSaving(true)
    const result = await dispatch(saveSupplierProductThunk({ supplierId, productId: Number(selected.id), cost: value, supplierCode: supplierCode.trim() }))
    setSaving(false)
    if (saveSupplierProductThunk.fulfilled.match(result)) {
      setItems(result.payload)
      toast.success('Producto guardado en el catálogo del proveedor')
      clearSelection()
    } else {
      toast.error(result.payload ?? 'No se pudo guardar el producto.')
    }
  }

  const remove = async (productId: number) => {
    setSaving(true)
    const result = await dispatch(deleteSupplierProductThunk({ supplierId, productId }))
    setSaving(false)
    if (deleteSupplierProductThunk.fulfilled.match(result)) {
      setItems((prev) => (prev ?? []).filter((item) => item.productId !== productId))
    } else {
      toast.error(result.payload ?? 'No se pudo quitar el producto.')
    }
  }

  return { items, loadError, text, setText, results, searching: canSearch && found.query !== needle, selected, choose, clearSelection, cost, setCost, supplierCode, setSupplierCode, saving, save, remove }
}
