// useCartMenuActions · opciones del menú hamburguesa del carrito (en el encabezado del panel derecho): vaciar el carrito y compartirlo
// conecta con: DrawerRight (las muestra en DrawerHeader), shop.cart.update.thunks (vaciar), shop.selectors (renglones y total), shop.helpers (texto para compartir) y global toast
// ojo: «Compartir carrito» copia al portapapeles un resumen con los productos, cantidades y el total; ambas opciones quedan apagadas si el carrito está vacío
import { useMemo } from 'react'
import { toast } from '@/global/helpers/feedback/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { buildCartShareText } from '../helpers/shop.helpers'
import { selectCartItems, selectCartMutating, selectCartTotals } from '../selectors/shop.selectors'
import { clearCartThunk } from '../thunks/shop.cart.update.thunks'
import type { DrawerMenuAction } from '@/global/types/drawerMenu.types'

export const useCartMenuActions = (): DrawerMenuAction[] => {
  const dispatch = useAppDispatch()
  const items = useAppSelector(selectCartItems)
  const { totalAmount } = useAppSelector(selectCartTotals)
  const busy = useAppSelector(selectCartMutating)

  return useMemo(() => {
    const isEmpty = items.length === 0
    return [
      {
        key: 'share',
        label: 'Compartir carrito',
        disabled: isEmpty,
        onClick: () => {
          navigator.clipboard?.writeText(buildCartShareText(items, totalAmount)).catch(() => undefined)
          toast.success('Carrito copiado', { description: 'Pégalo en WhatsApp o donde quieras compartirlo.' })
        },
      },
      { key: 'clear', label: 'Vaciar carrito', danger: true, disabled: isEmpty || busy, onClick: () => dispatch(clearCartThunk()) },
    ]
  }, [items, totalAmount, busy, dispatch])
}
