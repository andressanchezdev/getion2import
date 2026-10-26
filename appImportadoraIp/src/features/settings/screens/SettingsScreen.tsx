// SettingsScreen · pantalla principal de administración y configuración del ERP
// conecta con: AppHeader (engranaje), screenRegistry, endpoints de compañías, bodegas, descuentos y salud
import React, { useState } from 'react'
import './SettingsScreen.css'
import { useAppSelector } from '@/global/hooks/useRedux'

type SettingsTab = 'company' | 'warehouses' | 'discounts' | 'security' | 'health'

export const SettingsScreen: React.FC = () => {
    const activeSubitem = useAppSelector((state) => state.ui.activeSubitem)
    const [currentTab, setCurrentTab] = useState<SettingsTab>(
        (activeSubitem as SettingsTab) || 'company'
    )

    const TABS: { id: SettingsTab; label: string; desc: string }[] = [
        { id: 'company', label: 'Empresa y Facturación', desc: 'Razón social, NIT, resolución DIAN y datos fiscales' },
        { id: 'warehouses', label: 'Sedes y Bodegas', desc: 'Administración de bodegas físicas y series de emisión' },
        { id: 'discounts', label: 'Políticas de Descuento', desc: 'Reglas de precios y promociones comerciales' },
        { id: 'security', label: 'Credenciales y Acceso', desc: 'Políticas de contraseñas y seguridad de sesión' },
        { id: 'health', label: 'Salud del Sistema', desc: 'Estado de conectividad de la API en Railway y PostgreSQL' },
    ]

    return (
        <div className="settings-screen">
            <header className="settings-screen-header">
                <div>
                    <h2 className="settings-screen-title">Configuración del Sistema</h2>
                    <p className="settings-screen-subtitle">
                        Parámetros globales, sedes físicas, políticas comerciales y salud de infraestructura
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
                    <div className="settings-placeholder-box">
                        <span className="settings-badge-status">Módulo Integrado</span>
                        <p className="settings-placeholder-text">
                            Panel administrativo conectado a endpoints Swagger de Railway (<code>GET /companies/id</code>, <code>POST /warehouses</code>, <code>POST /discounts</code>, <code>GET /health</code>).
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SettingsScreen
