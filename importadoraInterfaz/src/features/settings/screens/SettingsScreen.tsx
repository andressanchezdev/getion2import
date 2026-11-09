// SettingsScreen · pantalla principal de administración y configuración del ERP
import React, { useState } from 'react'
import './SettingsScreen.css'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { ScreensaverTab } from './ScreensaverTab'
import { CompanyTab } from './CompanyTab'
import { SecurityTab } from './SecurityTab'
import { BackupTab } from './BackupTab'

type SettingsTab = 'company' | 'screensaver' | 'security' | 'health' | 'backups'

export const SettingsScreen: React.FC = () => {
  const activeSubitem = useAppSelector((state) => state.ui.activeSubitem)
  const [currentTab, setCurrentTab] = useState<SettingsTab>(
    activeSubitem === 'screensaver' || activeSubitem === 'security' || activeSubitem === 'health' || activeSubitem === 'backups'
      ? (activeSubitem as SettingsTab)
      : 'company'
  )

  const TABS: { id: SettingsTab; label: string; desc: string }[] = [
    { id: 'company', label: 'Empresa', desc: 'Razón social, NIT, representación legal, datos fiscales y documentos comerciales' },
    { id: 'screensaver', label: 'Protector', desc: 'Gestión y personalización de la imagen animada del protector de pantalla' },
    { id: 'security', label: 'Credenciales y Acceso', desc: 'Perfil del usuario activo, seguridad de acceso y actualización de credenciales' },
    { id: 'health', label: 'Salud del Sistema', desc: 'Estado de conectividad de la API en Railway y PostgreSQL' },
    { id: 'backups', label: 'Respaldos', desc: 'Copias de seguridad de PostgreSQL, descarga y restauración' },
  ]

  return (
    <div className="settings-screen">
      <header className="settings-screen-header">
        <div>
          <h2 className="settings-screen-title">Configuración del Sistema</h2>
          <p className="settings-screen-subtitle">
            Parámetros corporativos, protector de pantalla, credenciales y estado del sistema.
          </p>
        </div>
      </header>

      {/* Pestañas de Navegación de Configuración */}
      <nav className="settings-tabs" aria-label="Secciones de configuración">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCurrentTab(tab.id)}
            className={`settings-tab-btn ${currentTab === tab.id ? 'settings-tab-btn-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Contenido de la pestaña activa */}
      <div className="settings-content-card">
        <div className="settings-section-info">
          <h3 className="settings-section-title">
            {TABS.find((t) => t.id === currentTab)?.label}
          </h3>
          <p className="settings-section-desc">
            {TABS.find((t) => t.id === currentTab)?.desc}
          </p>
        </div>

        <div className="settings-section-body">
          {currentTab === 'company' && <CompanyTab />}
          {currentTab === 'screensaver' && <ScreensaverTab />}
          {currentTab === 'security' && <SecurityTab />}
          {currentTab === 'backups' && <BackupTab />}
          {currentTab === 'health' && (
            <div className="settings-placeholder-box">
              <span className="settings-badge-status">Servicios en Línea</span>
              <p className="settings-placeholder-text">
                Conexión activa con el backend Go (puerto 3001) y base de datos relacional PostgreSQL 18.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsScreen
