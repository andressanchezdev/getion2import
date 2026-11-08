// useProductImages · imágenes de los productos de un listado (renglones de pedido, cotización, compra o traslado) pedidas por lote al backend
// conecta con: shop.products.service (fetchProductThumbnails) y ProductLine (recibe la url); lo usan los paneles laterales que listan productos
// ojo: pide solo los ids que aún no tiene y no vuelve a pedir los que ya llegaron; si falla, los renglones se ven con el ícono de paquete
import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchProductThumbnails } from '../services/shop.products.service'

export const useProductImages = (productIds: number[]): Record<number, string> => {
  const [images, setImages] = useState<Record<number, string>>({})
  const asked = useRef(new Set<number>())
  const mounted = useRef(true)
  const key = useMemo(() => Array.from(new Set(productIds.filter((id) => id > 0))).sort((a, b) => a - b).join(','), [productIds])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    const missing = key.split(',').filter(Boolean).map(Number).filter((id) => !asked.current.has(id))
    if (missing.length === 0) return
    missing.forEach((id) => asked.current.add(id))
    fetchProductThumbnails(missing)
      .then((found) => {
        if (mounted.current) setImages((current) => ({ ...current, ...found }))
      })
      .catch(() => undefined)
  }, [key])

  return images
}
