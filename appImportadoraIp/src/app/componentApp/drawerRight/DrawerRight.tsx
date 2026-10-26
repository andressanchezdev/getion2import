// DrawerRight · panel derecho contextual: carrito en el catálogo, o detalle del objeto seleccionado; en cualquier otro caso no se muestra
// conecta con: drawerRegistry (modo y contenido), DrawerHeader, DrawerTab (carrito contraído), useDrawerPresence (animación de salida), global useEscapeKey
// ojo: antes mostraba un panel genérico en todos los módulos con un botón circular para contraerlo; ahora aparece solo cuando hay algo que hacer
import React, { useState } from 'react'
import './DrawerRight.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { useEscapeKey } from '@/global/hooks/useEscapeKey'
import { selectCartTotals } from '@/features/shop'
import { DRAWER_REGISTRY, selectDrawerMode } from './drawerRegistry'
import { useDrawerPresence } from './useDrawerPresence'
import { DrawerHeader } from './parts/DrawerHeader'
import { DrawerTab } from './parts/DrawerTab'

export const DrawerRight: React.FC = () => {
  const dispatch = useAppDispatch()
  const mode = useAppSelector(selectDrawerMode)
  const { totalItemsCount } = useAppSelector(selectCartTotals)
  const [isCartCollapsed, setIsCartCollapsed] = useState(false)

  // el carrito contraído deja el panel cerrado pero muestra la pestaña con el contador
  const effectiveMode = mode === 'cart' && isCartCollapsed ? null : mode
  const { shownMode, isMounted, isOpen } = useDrawerPresence(effectiveMode)
  const entry = shownMode ? DRAWER_REGISTRY[shownMode] : null
  const meta = useAppSelector(entry ? entry.selectMeta : () => null)

  // cerrar: el carrito se contrae; un objeto se deselecciona
  const handleClose = () => {
    if (entry?.close) entry.close(dispatch)
    else setIsCartCollapsed(true)
  }
  useEscapeKey(handleClose, isOpen)

  return (
    <>
      {mode === 'cart' && isCartCollapsed && (
        <DrawerTab icon={DRAWER_REGISTRY.cart.icon} count={totalItemsCount} onOpen={() => setIsCartCollapsed(false)} />
      )}

      {isMounted && entry && meta && (
        <aside className={`drawer-right ${isOpen ? 'drawer-right-open' : ''}`} aria-label={meta.title}>
          <div className="drawer-right-panel">
            <DrawerHeader icon={entry.icon} meta={meta} onClose={handleClose} />
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
