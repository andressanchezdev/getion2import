// MainContent · lienzo central: muestra la pantalla según el módulo y subitem activos con guardia de permisos
// conecta con: navigation (estado ui), usePermissions (hasScreenAccess), screenRegistry y MainContentPlaceholder
import React from 'react'
import './MainContent.css'
import { useAppSelector } from '@/global/hooks/useRedux'
import { getModuleIcon, getSubitemLabel } from '@/features/navigation'
import { usePermissions } from '@/global/hooks/usePermissions'
import { renderScreen } from './screenRegistry'
import { MainContentPlaceholder } from './MainContentPlaceholder'

export const MainContent: React.FC = () => {
  const { activeModule, activeSubitem } = useAppSelector((state) => state.ui)
  const { hasScreenAccess } = usePermissions()
  const isAuthorized = hasScreenAccess(activeModule, activeSubitem)
  const subitemLabel = getSubitemLabel(activeModule, activeSubitem)
  const screen = renderScreen(activeModule, activeSubitem)

  return (
    <main className="main-content">
      {/* Encabezado del Área de Trabajo */}
      <div className="main-content-header">
        <h2 className="main-content-title">
          <img src={getModuleIcon(activeModule)} alt="" className="main-content-title-icon" />
          <span>
            {subitemLabel || 'Inicio'}
          </span>
        </h2>
      </div>

      {/* Contenido dinámico del submódulo activo o guardia de acceso no autorizado */}
      <div className="main-content-viewport" key={`${activeModule}-${activeSubitem}`}>
        {!isAuthorized ? (
          <div className="main-content-unauthorized">
            <div className="main-content-unauthorized-card">
              <div className="main-content-unauthorized-icon">🔒</div>
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
          screen ?? <MainContentPlaceholder moduleId={activeModule} subitemLabel={subitemLabel} />
        )}
      </div>
    </main>
  )
}


export default MainContent
