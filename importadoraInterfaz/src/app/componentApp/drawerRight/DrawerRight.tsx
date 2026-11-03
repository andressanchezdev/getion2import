// DrawerRight · panel derecho contextual: carrito en el catálogo, detalle del objeto seleccionado o formulario de la acción abierta; se cierra con un clic fuera de él o con Esc
import React, { useRef, useState } from 'react'
import './DrawerRight.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { useEscapeKey } from '@/global/hooks/ui/useEscapeKey'
import { useClickOutside } from '@/global/hooks/ui/useClickOutside'
import { setRightDrawerOpen } from '@/features/navigation'
import { selectCartTotals, useCartMenuActions } from '@/features/shop'
import { DRAWER_REGISTRY, selectDrawerMode } from './drawerRegistry'
import { useDrawerPresence } from './useDrawerPresence'
import { DrawerHeader } from './parts/DrawerHeader'
import { DrawerTab } from './parts/DrawerTab'

// los clics en ventanas de confirmación y alertas no cuentan como «fuera» del panel (si no, confirmar algo lo cerraría)
const KEEP_OPEN_SELECTOR = '[role="dialog"], [role="alertdialog"], [data-sonner-toaster]'

export const DrawerRight: React.FC = () => {
  const dispatch = useAppDispatch()
  const mode = useAppSelector(selectDrawerMode)
  const { totalItemsCount } = useAppSelector(selectCartTotals)
  const [isCartCollapsed, setIsCartCollapsed] = useState(false)
  const cartMenu = useCartMenuActions()
  const panelRef = useRef<HTMLDivElement>(null)

  // el carrito contraído deja el panel cerrado pero muestra la pestaña con el contador
  const effectiveMode = mode === 'cart' && isCartCollapsed ? null : mode
  const { shownMode, isMounted, isOpen } = useDrawerPresence(effectiveMode)
  const entry = shownMode ? DRAWER_REGISTRY[shownMode] : null
  const meta = useAppSelector(entry ? entry.selectMeta : () => null)

  // cerrar: el carrito se contrae; un objeto se deselecciona; se apaga rightDrawerOpen
  const handleClose = () => {
    dispatch(setRightDrawerOpen(false))
    if (entry?.close) entry.close(dispatch)
    else setIsCartCollapsed(true)
  }
  useEscapeKey(handleClose, isOpen)
  // el carrito se cierra exclusivamente con su botón de cerrar (>) o Esc; no por clic afuera
  const shouldCloseOnClickOutside = isOpen && shownMode !== 'cart'
  useClickOutside(panelRef, handleClose, shouldCloseOnClickOutside, KEEP_OPEN_SELECTOR)

  return (
    <>
      {mode === 'cart' && isCartCollapsed && (
        <DrawerTab icon={DRAWER_REGISTRY.cart.icon} count={totalItemsCount} onOpen={() => setIsCartCollapsed(false)} />
      )}

      {isMounted && entry && meta && (
        <aside className={`drawer-right ${isOpen ? 'drawer-right-open' : ''}`} aria-label={meta.title}>
          <div ref={panelRef} className={`drawer-right-panel ${shownMode === 'cart' ? 'drawer-right-panel-lite' : ''}`}>
            <DrawerHeader icon={entry.icon} meta={meta} onClose={handleClose} menu={shownMode === 'cart' ? cartMenu : undefined} />
            <div className="drawer-right-body">
              <entry.Body />
            </div>
          </div>
        </aside>
      )}
    </>
  )
}

export default DrawerRight
