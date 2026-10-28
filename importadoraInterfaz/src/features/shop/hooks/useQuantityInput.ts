// useQuantityInput · estado del contador de cantidad de la tarjeta: botones - y +, número escrito a mano y flechas del teclado
// conecta con: ProductCard (lo usa y pasa los valores a ProductCardActions); clampQuantity de shop.helpers pone el límite (1 hasta el stock)
// ojo: mientras se escribe se guarda el texto aparte ("draft"); el número recién vale cuando se sale del campo o se presiona Enter, así se puede borrar y teclear sin saltos
import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { clampQuantity } from '../helpers/shop.helpers'

export const useQuantityInput = (max: number) => {
  const [quantity, setQuantity] = useState<number>(1)
  const [draft, setDraft] = useState<string | null>(null)

  // si la bodega cambia y hay menos stock, la cantidad se ajusta sin necesitar un efecto
  const current = clampQuantity(quantity, max)

  const commit = (value: number): number => {
    const next = clampQuantity(value, max)
    setQuantity(next)
    setDraft(null)
    return next
  }

  // confirma lo escrito (campo vacío = 1) y devuelve la cantidad final; la usa "Ordenar" y Enter
  const commitDraft = (): number => (draft === null ? current : commit(draft === '' ? 1 : Number(draft)))

  // solo dígitos y máximo 6, para que no se pegue texto raro
  const handleChange = (value: string) => setDraft(value.replace(/\D/g, '').slice(0, 6))

  // flecha arriba suma 1 y flecha abajo resta 1 (parte de lo que se esté escribiendo)
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    const base = draft === null ? current : draft === '' ? 1 : Number(draft)
    commit(base + (event.key === 'ArrowUp' ? 1 : -1))
  }

  return {
    quantity: current,
    text: draft ?? String(current),
    increment: () => commit(current + 1),
    decrement: () => commit(current - 1),
    commitDraft,
    handleChange,
    handleKeyDown,
    handleBlur: () => {
      commitDraft()
    },
  }
}
