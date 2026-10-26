// useTransferProductSearch · busca repuestos con su existencia en cada bodega mientras el modal de traslado está abierto
// conecta con: CreateTransferModal; usa transfers.service (searchProductsMultibodega), useDebouncedValue y la sesión y las bodegas de Redux
// ojo: la búsqueda va al backend; el texto espera 300 ms tras la última letra para no pedir una vez por tecla, y la respuesta de una búsqueda vieja se descarta
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/global/hooks/useRedux'
import { useDebouncedValue } from '@/global/hooks/useDebouncedValue'
import { searchProductsMultibodega } from '../services/transfers.service'
import type { ProductStockMatrix } from '../types/transfers.types'

export const useTransferProductSearch = (isOpen: boolean, search: string): ProductStockMatrix[] => {
  const companyId = useAppSelector((state) => state.auth.user?.companyId)
  const warehouses = useAppSelector((state) => state.warehouses.items)
  const debouncedSearch = useDebouncedValue(search, 300)
  const [products, setProducts] = useState<ProductStockMatrix[]>([])

  useEffect(() => {
    if (!isOpen || !companyId) return
    let current = true
    searchProductsMultibodega(companyId, warehouses, debouncedSearch)
      .then((rows) => current && setProducts(rows))
      .catch(() => current && setProducts([]))
    return () => {
      current = false
    }
  }, [isOpen, debouncedSearch, companyId, warehouses])

  return products
}
