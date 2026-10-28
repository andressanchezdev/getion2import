// MainContentPlaceholder · aviso de módulo o subgestión que todavía no tiene pantalla ("Próxima Fase")
// conecta con: MainContent (cuando screenRegistry no devuelve pantalla); título e ícono de navigation
import { getModuleIcon, type ERPModule } from '@/features/navigation'
import './MainContentPlaceholder.css'

interface MainContentPlaceholderProps {
  moduleId: ERPModule
  subitemLabel: string
}

export const MainContentPlaceholder: React.FC<MainContentPlaceholderProps> = ({ moduleId, subitemLabel }) => {
  return (
    <div className="main-content-canvas-section">
      <div className="main-content-canvas-header">
        <h3 className="main-content-canvas-title">
          {subitemLabel || 'General'}
        </h3>
        <span className="main-content-canvas-tag">Próxima Fase</span>
      </div>
      <div className="main-content-canvas-placeholder">
        <img src={getModuleIcon(moduleId)} alt="" className="main-content-placeholder-icon" />
        <h4 className="main-content-canvas-placeholder-heading">Submódulo preparado para integración</h4>
        <p className="main-content-canvas-placeholder-text">
          Este espacio cargará la pantalla de <strong>{subitemLabel || moduleId}</strong>{' '}
          conectada a su feature de dominio en las siguientes fases.
        </p>
      </div>
    </div>
  )
}

export default MainContentPlaceholder
