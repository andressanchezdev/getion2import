// useCartQuantity · cantidad editable de una línea del carrito: se escribe a mano o flechas y se confirma SOLO al presionar Enter o al salir del campo
// conecta con: ShopCartItem (la usa); updateCartQuantityThunk (shop.cart.update.thunks) cambia la cantidad en el backend
// ojo: la cantidad solo se ejecuta al salir (onBlur) o Enter; se valida estrictamente contra el stock de la bodega
import { useCallback, useState } from 'react'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { updateCartQuantityThunk } from '../thunks/shop.cart.update.thunks'

// maxQuantity: lo vendible de la bodega activa (si no se conoce no se limita; el backend igual valida)
export const useCartQuantity = (cartId: number, quantity: number, maxQuantity?: number) => {
  const dispatch = useAppDispatch()
  const [draft, setDraft] = useState<string | null>(null)
  const [seenQuantity, setSeenQuantity] = useState(quantity)

  // cuando la cantidad del backend cambia, el campo vuelve a mostrarla (sin necesitar un efecto)
  if (quantity !== seenQuantity) {
    setSeenQuantity(quantity)
    setDraft(null)
  }

  // envía lo escrito: se valida contra el stock vendible de la bodega (mínimo 1)
  const commit = useCallback(
    (value: string) => {
      const typed = Math.floor(Number(value))
      if (!Number.isFinite(typed) || typed < 1) {
        setDraft(null)
        return
      }
      const next = maxQuantity !== undefined && maxQuantity > 0 ? Math.min(typed, maxQuantity) : typed
      if (next === quantity) {
        setDraft(null)
        return
      }
      dispatch(updateCartQuantityThunk({ cartId, quantity: next })).then(() => {
        setDraft(null)
      })
    },
    [cartId, dispatch, quantity, maxQuantity]
  )

  return {
    text: draft ?? String(quantity),
    handleChange: setDraft,
    handleBlur: () => {
      if (draft !== null) commit(draft)
    },
    commitDraft: () => {
      if (draft !== null) commit(draft)
    },
  }
}
