// DrawerRight · panel derecho contextual: carrito en el catálogo, detalle del objeto seleccionado o formulario de la acción abierta; se cierra con un clic fuera de él o con Esc
import React, { useRef, useState } from 'react'
import './DrawerRight.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { useEscapeKey } from '@/global/hooks/ui/useEscapeKey'
import { useClickOutside } from '@/global/hooks/ui/useClickOutside'
import { useVerticalDrag } from '@/global/hooks/ui/useVerticalDrag'
import { closeDrawerForm, openDrawerForm, setRightDrawerOpen } from '@/features/navigation'
import { selectCartTotals, useCartMenuActions } from '@/features/shop'
import { DRAWER_REGISTRY, selectDrawerMode } from './drawerRegistry'
import { useDrawerPresence } from './useDrawerPresence'
import { DrawerHeader } from './parts/DrawerHeader'
import { DrawerTab } from './parts/DrawerTab'
import shippingIcon from '@/assets/icons/shipping.svg'

// los clics en ventanas de confirmación y alertas no cuentan como «fuera» del panel (si no, confirmar algo lo cerraría)
const KEEP_OPEN_SELECTOR = '[role="dialog"], [role="alertdialog"], [data-sonner-toaster]'
const TAB_HEIGHT_OFFSET = 68 // Altura de pestaña más margen de separación para no sobreponerse

export const DrawerRight: React.FC = () => {
  const dispatch = useAppDispatch()
  const mode = useAppSelector(selectDrawerMode)
  const drawerForm = useAppSelector((state) => state.ui.drawerForm)
  const activeModule = useAppSelector((state) => state.ui.activeModule)
  const activeSubitem = useAppSelector((state) => state.ui.activeSubitem)
  const { totalItemsCount } = useAppSelector(selectCartTotals)
  const [isCartCollapsed, setIsCartCollapsed] = useState(false)
  const cartMenu = useCartMenuActions()
  const panelRef = useRef<HTMLDivElement>(null)

  // Detección de módulo de catálogo
  const isInCatalog = (activeModule === 'shop' && activeSubitem === 'catalog') || mode === 'cart'

  // Borrador de traslados activos (memoria a corto plazo)
  const transferDraft = useAppSelector((state) => state.transfers.draft)
  const transferUnitsCount = transferDraft.lines.reduce((acc, l) => acc + (l.quantity || 0), 0)

  // el carrito contraído deja el panel cerrado pero muestra la pestaña con el contador
  const effectiveMode = mode === 'cart' && isCartCollapsed ? null : mode
  const { shownMode, isMounted, isOpen } = useDrawerPresence(effectiveMode)
  const entry = shownMode ? DRAWER_REGISTRY[shownMode] : null
  const meta = useAppSelector(entry ? entry.selectMeta : () => null)

  // Estados de apertura
  const isTransferFormOpen = shownMode === 'form' && drawerForm?.kind === 'createTransfer' && isOpen
  const isCartDrawerOpen = shownMode === 'cart' && isOpen

  // Visibilidad de pestañas laterales (al mismo nivel)
  const isCartTabVisible = isInCatalog && !isCartDrawerOpen
  const isTransferTabVisible = (isInCatalog || transferUnitsCount > 0) && !isTransferFormOpen

  // Arrastre vertical coordinado: si ambas pestañas están visibles, reserva el espacio para evitar solapamiento
  const bothTabsVisible = isCartTabVisible && isTransferTabVisible
  const extraHeight = bothTabsVisible ? TAB_HEIGHT_OFFSET : 0
  const dragCoord = useVerticalDrag('ip_cart_tab_top', extraHeight)

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

  // Posiciones verticales calculadas para que NUNCA se sobrepongan entre ellas
  const cartTabTop = isCartTabVisible ? dragCoord.top : null
  const transferTabTop = isTransferTabVisible
    ? isCartTabVisible
      ? (dragCoord.top !== null ? dragCoord.top + TAB_HEIGHT_OFFSET : null)
      : dragCoord.top
    : null

  // Desplazamiento horizontal para ubicarse en el borde exterior cuando el panel está abierto
  const tabRight = isOpen ? 'var(--drawer-width-open, 400px)' : 0

  return (
    <>
      {/* Pestaña lateral del carrito (reutilizable) */}
      {isCartTabVisible && (
        <DrawerTab
          innerRef={dragCoord.ref}
          icon={DRAWER_REGISTRY.cart.icon}
          count={totalItemsCount}
          onOpen={() => {
            if (drawerForm) dispatch(closeDrawerForm())
            setIsCartCollapsed(false)
            dispatch(setRightDrawerOpen(true))
          }}
          label="carrito"
          storageKey="ip_cart_tab_top"
          controlledTop={cartTabTop}
          controlledRight={tabRight}
          isDragging={dragCoord.isDragging}
          handlers={dragCoord.handlers}
        />
      )}

      {/* Pestaña lateral de la solicitud de traslado (al mismo nivel, no se sobrepone, deslizan sincronizadas) */}
      {isTransferTabVisible && (
        <DrawerTab
          innerRef={isCartTabVisible ? undefined : dragCoord.ref}
          icon={shippingIcon}
          count={transferUnitsCount}
          onOpen={() => {
            setIsCartCollapsed(true)
            dispatch(openDrawerForm({ kind: 'createTransfer' }))
            dispatch(setRightDrawerOpen(true))
          }}
          label="solicitud de traslado"
          title="Abrir solicitud de traslado · arrástralo para moverlo"
          storageKey="ip_cart_tab_top"
          className="drawer-tab-transfer"
          controlledTop={transferTabTop}
          controlledRight={tabRight}
          isDragging={dragCoord.isDragging}
          handlers={dragCoord.handlers}
        />
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
