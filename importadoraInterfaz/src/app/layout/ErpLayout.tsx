// ErpLayout · layout del ERP: menú lateral, columna central (cabecera y contenido) y drawer derecho
// conecta con: componentApp/* (header, sideMenu, contentMain, drawerRight) y features/realtime (useRealtime) y features/auth (useSessionActivity) y features/shop (useCartSync) y features/screensaver (protector de pantalla); lo muestra AuthGate cuando hay sesión
// ojo: antes este layout vivía dentro de StoreApp; StoreApp ahora solo pone el Provider y la puerta de entrada
// ojo: como en la maqueta, la cabecera ya no cruza todo el ancho: va dentro de la columna central y la marca pasó al menú lateral
import './ErpLayout.css'
import { useRealtime } from '@/features/realtime'
import { useSessionActivity } from '@/features/auth'
import { useCartSync } from '@/features/shop'
import { useRouteSync } from '@/features/navigation'
import { IdleScreensaver } from '@/features/screensaver'

import { SideMenu } from '@/app/componentApp/sideMenu/SideMenu'
import { MainContent } from '@/app/componentApp/contentMain/MainContent'
import { DrawerRight } from '@/app/componentApp/drawerRight/DrawerRight'

export function ErpLayout() {
  // ojo: abre el tiempo real mientras haya sesión (si no hay VITE_WS_URL queda desactivado y no se conecta a nada)
  useRealtime()

  // ojo: vigila la sesión mientras el usuario está dentro: cierra a los 3 minutos sin actividad y renueva el token en silencio
  useSessionActivity()

  // ojo: lee el carrito del backend mientras haya sesión (el panel derecho muestra su cantidad desde el inicio) y lo limpia al salir
  useCartSync()

  // ojo: la URL del navegador refleja la pantalla activa (/módulo/subgestión) y al revés
  useRouteSync()

  return (
    <div className="store-app-layout">
      {/* Menú lateral izquierdo (232px, token --sidebar-width; 64px cuando está contraído) */}
      <SideMenu />

      {/* Columna central: cabecera y lienzo flexible (flex-1) */}
      <div className="store-app-main">
        <MainContent />
      </div>

      {/* Panel lateral derecho (aparece solo cuando hay algo que mostrar) */}
      <DrawerRight />

      {/* Protector de pantalla: aparece tras un rato sin actividad y se cierra al volver el usuario */}
      <IdleScreensaver />
    </div>
  )
}

export default ErpLayout
