// useProductPriceEditor · estado de la edición de la lista de precios (P0..P3) de un producto: formulario, guardado y mensajes
// conecta con: ProductDetailPanel (lo usa) y inventory.thunks (saveProductPricesThunk)
import { useState } from 'react'
import type { Product, ProductPrices } from '@/features/shop'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { saveProductPricesThunk } from '../thunks/inventory.thunks'

// los cuatro precios del producto, con 0 donde no hay tarifa
const pricesOf = (product: Product): ProductPrices => ({
  p0: product.prices?.p0 ?? 0,
  p1: product.prices?.p1 ?? 0,
  p2: product.prices?.p2 ?? 0,
  p3: product.prices?.p3 ?? 0,
})

// maneja el formulario de tarifas y devuelve el producto con los precios ya guardados
export const useProductPriceEditor = (initialProduct: Product) => {
  const dispatch = useAppDispatch()
  const [product, setProduct] = useState<Product>(initialProduct)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<ProductPrices>(() => pricesOf(initialProduct))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // anota el valor de una tarifa (solo dígitos, nunca negativo)
  const change = (tier: keyof ProductPrices, value: string) => {
    const num = Math.max(0, Number(value.replace(/[^0-9]/g, '')) || 0)
    setForm((prev) => ({ ...prev, [tier]: num }))
  }

  // abre la edición con los precios actuales
  const start = () => {
    setForm(pricesOf(product))
    setEditing(true)
    setError(null)
    setSuccess(null)
  }

  // cierra la edición sin guardar
  const cancel = () => setEditing(false)

  // guarda las tarifas en el servidor y actualiza el producto mostrado
  const save = async (event?: React.SyntheticEvent) => {
    event?.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await dispatch(saveProductPricesThunk({ id: product.id, prices: form })).unwrap()
      setProduct({ ...product, prices: form })
      setSuccess('Precios actualizados correctamente.')
      setEditing(false)
    } catch (message) {
      setError(typeof message === 'string' ? message : 'Error al actualizar precios')
    } finally {
      setSaving(false)
    }
  }

  return { product, editing, form, saving, error, success, change, start, cancel, save }
}
