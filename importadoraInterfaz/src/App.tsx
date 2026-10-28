// App · raíz de la app, solo monta StoreApp
// conecta con: app/layout/StoreApp y global AppToaster (alertas flotantes)
import StoreApp from '@/app/layout/StoreApp'
import { AppToaster } from '@/global/components/UI/atoms/AppToaster'
// ojo: los botones (btn-primary, btn-secondary, btn-danger, btn-accent) se estilan una sola vez para toda la app
import '@/global/components/UI/atoms/Button.css'


//aqui se centra el inicio de app, renderiza/carga store.tsx la cual es la base de la app 
//en store esta toda la logica, componentes, hooks, etc.
//en store.tsx se renderiza layout/layout.tsx la cual es la base de la app
//en layout.tsx se renderiza header/AppHeader.tsx, contentMain/MainContent.tsx y sideMenu/SideMenu.tsx
export default function App() {
  return (
    <>
      <StoreApp />
      {/* alertas flotantes: se montan una sola vez para toda la app */}
      <AppToaster />
    </>
  )
}

// ojo: el montaje en el DOM (createRoot) y la importación de App.css ahora viven en main.tsx
