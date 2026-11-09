// DashboardScreen · pantalla principal de Dashboard / resumen ejecutivo de métricas clave (limpia, preparada para próximas integraciones)
import React from 'react'
import './DashboardScreen.css'
import { Icon } from '@/global/components/UI/atoms/Icon'
import fileTextIcon from '@/assets/icons/file-text.svg?raw'

export const DashboardScreen: React.FC = () => {
  return (
    <div className="dashboard-screen">
      <div className="dashboard-empty-card">
        <div className="dashboard-empty-icon"><Icon svg={fileTextIcon} size="xl" /></div>
        <h3 className="dashboard-empty-title">Dashboard Ejecutivo</h3>
        <p className="dashboard-empty-desc">
          Este espacio está preparado para visualizar indicadores clave de rendimiento, analítica avanzada de ventas y rentabilidad consolidada de la compañía.
        </p>
      </div>
    </div>
  )
}

export default DashboardScreen

