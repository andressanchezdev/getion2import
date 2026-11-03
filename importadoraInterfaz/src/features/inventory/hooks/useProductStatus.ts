// useProductStatus · activar o desactivar un producto desde la tabla, con su aviso y la fila actualizada al instante
// conecta con: ProductsTable (lo usa), inventory.thunks (saveProductDetailsThunk), inventory.slice (updateProductStatusLocally) y toast
// ojo: mientras un producto cambia de estado no se acepta otro cambio sobre ese mismo producto
import { useState } from 'react'
import type { Product } from '@/features/shop'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { toast } from '@/global/helpers/feedback/toast'
import { updateProductStatusLocally } from '../slices/inventory.slice'
import { saveProductDetailsThunk } from '../thunks/inventory.thunks'

export const useProductStatus = () => {
  const dispatch = useAppDispatch()
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // cambia el estado del producto en el servidor y en la tabla; avisa si falla
  const changeStatus = async (product: Product, status: 'active' | 'inactive') => {
    setUpdatingId(product.id)
    try {
      await dispatch(saveProductDetailsThunk({ id: product.id, updates: { status } })).unwrap()
      dispatch(updateProductStatusLocally({ id: product.id, status }))
      toast.success(`Estado actualizado a ${status === 'active' ? 'Activo' : 'Inactivo'}`)
    } catch (message) {
      toast.error(typeof message === 'string' ? message : 'No se pudo actualizar el estado del producto')
    } finally {
      setUpdatingId(null)
    }
  }

  return { updatingId, changeStatus }
}
