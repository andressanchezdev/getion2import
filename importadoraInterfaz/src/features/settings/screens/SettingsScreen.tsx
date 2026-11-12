// SettingsScreen · pantalla principal de administración y configuración del ERP
// conecta con: CompanyTab, ScreensaverTab, SecurityTab, BackupTab y usePermissions (qué pestañas ve cada quien)
// ojo: la pantalla la ve todo el personal porque aloja la cuenta propia; cada pestaña exige su permiso (las mismas reglas de la API)
import React, { useState } from 'react'
import './SettingsScreen.css'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { ScreensaverTab } from './ScreensaverTab'
import { CompanyTab } from './CompanyTab'
import { SecurityTab } from './SecurityTab'
import { BackupTab } from './BackupTab'

type SettingsTab = 'company' | 'screensaver' | 'security' | 'health' | 'backups'

export const SettingsScreen: React.FC = () => {
  const activeSubitem = useAppSelector((state) => state.ui.activeSubitem)
  const userId = useAppSelector((state) => state.auth.user?.userId)
  const { can, level } = usePermissions()

  // visible: misma regla que la ruta de la API de cada pestaña
  const ALL_TABS: { id: SettingsTab; label: string; desc: string; visible: boolean }[] = [
    { id: 'company', label: 'Empresa', desc: 'Razón social, NIT, representación legal, datos fiscales y documentos comerciales', visible: can('warehouses:view') }, // GET /companies/:id
    { id: 'screensaver', label: 'Protector', desc: 'Gestión y personalización de la imagen animada del protector de pantalla', visible: can('screensaver:edit') }, // admin y superadmin
    { id: 'security', label: 'Credenciales y Acceso', desc: 'Perfil del usuario activo, seguridad de acceso y actualización de credenciales', visible: true }, // la cuenta propia
    { id: 'health', label: 'Salud del Sistema', desc: 'Estado de conectividad de la API en Railway y PostgreSQL', visible: true },
    { id: 'backups', label: 'Respaldos', desc: 'Copias de seguridad de PostgreSQL, descarga y restauración', visible: level === 'superadmin' }, // /backups es solo del superadmin
  ]
  const TABS = ALL_TABS.filter((tab) => tab.visible)
  const requested = TABS.find((tab) => tab.id === activeSubitem)?.id
  const [chosenTab, setCurrentTab] = useState<SettingsTab>(requested ?? TABS[0].id)
  // ojo: si la pestaña elegida deja de estar permitida (cambian los permisos) se muestra la primera permitida
  const currentTab = TABS.some((tab) => tab.id === chosenTab) ? chosenTab : TABS[0].id

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
          {currentTab === 'security' && <SecurityTab key={userId ?? 'anon'} />}
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
