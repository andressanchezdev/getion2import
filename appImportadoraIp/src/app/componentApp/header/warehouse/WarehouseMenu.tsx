// WarehouseMenu · lista desplegable de bodegas disponibles con la activa marcada
// conecta con: WarehouseSelector (le pasa la lista de bodegas del backend y la activa, y recibe la elegida); tipo Warehouse de features/warehouses
import React from 'react'
import type { Warehouse } from '@/features/warehouses'
import './WarehouseMenu.css'

interface WarehouseMenuProps {
    warehouses: Warehouse[]
    activeWarehouseId: string
    onSelect: (warehouse: Warehouse) => void
}

export const WarehouseMenu: React.FC<WarehouseMenuProps> = ({ warehouses, activeWarehouseId, onSelect }) => {
    return (
        <div className="app-header-warehouse-menu" role="listbox">
            <div className="app-header-warehouse-menu-header">Bodegas Disponibles</div>
            <div className="app-header-warehouse-menu-list">
                {warehouses.length === 0 && <div className="app-header-warehouse-menu-empty">No hay bodegas disponibles</div>}
                {warehouses.map((wh) => {
                    const isSelected = wh.id === activeWarehouseId
                    return (
                        <button
                            type="button"
                            key={wh.id}
                            onClick={() => onSelect(wh)}
                            className={`app-header-warehouse-menu-item ${isSelected ? 'app-header-warehouse-menu-item-selected' : ''}`}
                            role="option"
                            aria-selected={isSelected}
                        >
                            <div className="app-header-warehouse-menu-item-content">
                                <span
                                    className={`app-header-warehouse-menu-dot ${isSelected ? 'app-header-warehouse-menu-dot-active' : ''}`}
                                />
                                <span className="app-header-warehouse-menu-item-name">{wh.name}</span>
                            </div>
                            <div className="app-header-warehouse-menu-item-right">
                                <span className="app-header-warehouse-menu-item-id">#{wh.id}</span>
                                {isSelected && (
                                    <svg
                                        className="app-header-warehouse-menu-check"
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default WarehouseMenu
