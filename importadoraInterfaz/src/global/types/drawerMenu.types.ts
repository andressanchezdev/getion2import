// drawerMenu.types · una opción del menú hamburguesa del encabezado del panel derecho
// conecta con: DrawerHeader (la pinta), DrawerRight y las features que arman sus opciones (hoy el carrito: useCartMenuActions)
export interface DrawerMenuAction {
  key: string
  label: string
  danger?: boolean // se pinta en rojo (acciones que borran)
  disabled?: boolean
  onClick: () => void
}
