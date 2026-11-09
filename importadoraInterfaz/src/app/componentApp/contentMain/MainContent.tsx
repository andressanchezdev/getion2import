// MainContent · lienzo central: muestra la pantalla según el módulo y subitem activos con guardia de permisos
// conecta con: navigation (estado ui y títulos), usePermissions (hasScreenAccess), screenRegistry y MainContentPlaceholder
// ojo: como en la maqueta el título es la subgestión (20 px) con el nombre del módulo debajo en letra pequeña; se quitó el ícono del título y la línea inferior
import React from 'react'
import './MainContent.css'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { getModuleTitle, getSubitemLabel } from '@/features/navigation'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { labelForLevel } from '@/global/helpers/access/accessLevels'
import { renderScreen } from './screenRegistry'
import { MainContentPlaceholder } from './MainContentPlaceholder'
import { AppHeader } from '../header/AppHeader'
import { Icon } from '@/global/components/UI/atoms/Icon'
import lockIcon from '@/assets/icons/lock.svg?raw'

export const MainContent: React.FC = () => {
  const { activeModule, activeSubitem, activeWarehouseId } = useAppSelector((state) => state.ui)
  const warehouses = useAppSelector((state) => state.warehouses.items)
  const activeWh = warehouses.find((w) => w.id === activeWarehouseId)
  // La etiqueta de bodega en el encabezado solo aplica para la caja de tienda o traslados, nunca para Gestión Ventas
  const isCashShift = activeModule === 'shop' && activeSubitem === 'cashRegister'
  const isTransfers = activeSubitem === 'transfers' || activeModule === 'transfers'
  const { hasScreenAccess, level } = usePermissions()
  const isAuthorized = hasScreenAccess(activeModule, activeSubitem)
  const subitemLabel = labelForLevel(level, activeModule, activeSubitem, getSubitemLabel(activeModule, activeSubitem))
  const screen = renderScreen(activeModule, activeSubitem)

  return (
    <main className="main-content">
      {/* Encabezado del Área de Trabajo */}
      <div className="main-content-header">
        <div>
          <h2 className="main-content-title">
            {subitemLabel || 'Inicio'}
            {(isCashShift || isTransfers) && (
              <span className="cash-header-warehouse-tag">
                · {activeWh?.name || 'Bodega Principal'}
              </span>
            )}
          </h2>
          <small className="main-content-subtitle">{getModuleTitle(activeModule)}</small>
        </div>

        {/* compañía (superadmin), bodega y configuración, a la altura del título */}
        <AppHeader />
      </div>

      {/* Contenido dinámico del submódulo activo o guardia de acceso no autorizado */}
      <div className="main-content-viewport" key={`${activeModule}-${activeSubitem}`}>
        {!isAuthorized ? (
          <div className="main-content-unauthorized">
            <div className="main-content-unauthorized-card">
              <div className="main-content-unauthorized-icon"><Icon svg={lockIcon} size="xl" /></div>
              <h3 className="main-content-unauthorized-title">Acceso Restringido</h3>
              <p className="main-content-unauthorized-desc">
                No tienes permisos asignados para visualizar o gestionar este submódulo.
              </p>
              <p className="main-content-unauthorized-detail">
                Consulta con el administrador del sistema para habilitar el permiso correspondiente.
              </p>
            </div>
          </div>
        ) : (
          <React.Suspense fallback={null}>
            {screen ?? <MainContentPlaceholder moduleId={activeModule} subitemLabel={subitemLabel} />}
          </React.Suspense>
        )}
      </div>
    </main>
  )
}

export default MainContent
