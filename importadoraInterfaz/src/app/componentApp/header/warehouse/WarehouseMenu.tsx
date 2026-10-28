// WarehouseMenu · lista desplegable de bodegas disponibles con la activa marcada
// conecta con: WarehouseSelector (le pasa la lista de bodegas del backend y la activa, y recibe la elegida); tipo Warehouse de features/warehouses
// ojo: como el menú desplegable de la maqueta: sin título visible (queda en aria-label), la activa lleva ✔ y el número de bodega va en letra pequeña
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
        <div className="app-header-warehouse-menu" role="listbox" aria-label="Bodegas disponibles">
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
                        <span className="app-header-warehouse-menu-item-name">
                            {isSelected ? '✔ ' : ''}
                            {wh.name}
                        </span>
                        <small className="app-header-warehouse-menu-item-id">#{wh.id}</small>
                    </button>
                )
            })}
        </div>
    )
}

export default WarehouseMenu
