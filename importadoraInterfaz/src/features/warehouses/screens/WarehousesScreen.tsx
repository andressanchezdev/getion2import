// WarehousesScreen — Configuración > Sedes: resumen de bodegas, tabla general y gestión centralizada de ubicaciones por sede
// conecta con: WarehousesTable, WarehouseLocationsManagement y useManagedWarehouses
import React, { useState } from 'react'
import './WarehousesScreen.css'
import { WarehousesTable } from '../components/WarehousesTable'
import { WarehouseLocationsManagement } from '../components/WarehouseLocationsManagement'
import { useManagedWarehouses } from '../hooks/useManagedWarehouses'
import type { Warehouse } from '../types/warehouse.types'

type WarehousesViewMode = 'warehouses' | 'locations'

export const WarehousesScreen: React.FC = () => {
    const { all } = useManagedWarehouses()
    const active = all.filter((warehouse) => warehouse.isActive !== false).length
    const withManager = all.filter((warehouse) => warehouse.managerEmployeeId || warehouse.managerName).length

    const [viewMode, setViewMode] = useState<WarehousesViewMode>('warehouses')
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(() =>
        all.length > 0 ? Number(all[0].id) : 1
    )

    const handleManageLocations = (warehouse: Warehouse) => {
        setSelectedWarehouseId(Number(warehouse.id))
        setViewMode('locations')
    }

    return (
        <div className="warehouses-mgmt-screen">
            <div className="wh-kpis">
                <div className="wh-kpi">
                    <span className="wh-kpi-label">Sedes registradas</span>
                    <strong className="wh-kpi-value">{all.length}</strong>
                </div>
                <div className="wh-kpi">
                    <span className="wh-kpi-label">Operativas</span>
                    <strong className="wh-kpi-value">{active}</strong>
                </div>
                <div className="wh-kpi">
                    <span className="wh-kpi-label">Con administrador</span>
                    <strong className="wh-kpi-value">{withManager}</strong>
                </div>
            </div>

            <div className="wh-view-tabs" role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'warehouses'}
                    className={`wh-view-tab ${viewMode === 'warehouses' ? 'is-active' : ''}`}
                    onClick={() => setViewMode('warehouses')}
                >
                    Bodegas
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'locations'}
                    className={`wh-view-tab ${viewMode === 'locations' ? 'is-active' : ''}`}
                    onClick={() => setViewMode('locations')}
                >
                    Gestión de Ubicaciones
                </button>
            </div>

            {viewMode === 'warehouses' ? (
                <WarehousesTable onManageLocations={handleManageLocations} />
            ) : (
                <WarehouseLocationsManagement
                    warehouses={all}
                    selectedWarehouseId={selectedWarehouseId}
                    onSelectWarehouse={setSelectedWarehouseId}
                />
            )}
        </div>
    )
}

export default WarehousesScreen
