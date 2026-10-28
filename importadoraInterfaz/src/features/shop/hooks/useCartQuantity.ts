// useCartQuantity · cantidad editable de una línea del carrito: se escribe (o se sube con las flechas del campo) y se confirma tras una pausa o al salir del campo
// conecta con: ShopCartItem (la usa); updateCartQuantityThunk (shop.cart.update.thunks) cambia la cantidad en el backend
// ojo: el borrador evita pedir al backend en cada tecla o flecha; cuando el backend confirma otra cantidad el campo la muestra y lo escrito se descarta
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppDispatch } from '@/global/hooks/useRedux'
import { updateCartQuantityThunk } from '../thunks/shop.cart.update.thunks'

const COMMIT_DELAY_MS = 500 // pausa antes de enviar lo escrito al backend

export const useCartQuantity = (cartId: number, quantity: number) => {
  const dispatch = useAppDispatch()
  const [draft, setDraft] = useState<string | null>(null)
  const [seenQuantity, setSeenQuantity] = useState(quantity)
  const sent = useRef<string | null>(null) // lo último enviado (evita enviar dos veces lo mismo: por pausa y por salir del campo)

  // cuando la cantidad del backend cambia, el campo vuelve a mostrarla (sin necesitar un efecto)
  if (quantity !== seenQuantity) {
    setSeenQuantity(quantity)
    setDraft(null)
  }

  // envía lo escrito: si no es un número válido o no cambia nada, el campo vuelve a la cantidad actual
  const commit = useCallback(
    (value: string) => {
      if (sent.current === value) return
      const next = Math.floor(Number(value))
      if (!Number.isFinite(next) || next < 1 || next === quantity) {
        setDraft(null)
        return
      }
      sent.current = value
      dispatch(updateCartQuantityThunk({ cartId, quantity: next })).then(() => {
        sent.current = null
        setDraft(null)
      })
    },
    [cartId, dispatch, quantity]
  )

  useEffect(() => {
    if (draft === null) return
    const timer = setTimeout(() => commit(draft), COMMIT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [draft, commit])

  return {
    text: draft ?? String(quantity),
    handleChange: setDraft,
    handleBlur: () => {
      if (draft !== null) commit(draft)
    },
  }
}
