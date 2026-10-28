// WarehouseSelector · botón que muestra la bodega activa y abre el menú para cambiarla
// conecta con: navigation (bodega activa), features/warehouses (lista del backend y elección de la activa), auth (bodega del usuario), global useClickOutside (cierra con clic fuera o Escape)
// ojo: antes la lista era fija (WH-01); ahora llega de POST /warehouses y, al llegar, se deja activa la que ya estaba, la del usuario, la principal o la primera
// ojo: como en la maqueta el botón ya no lleva la etiqueta «Tienda:» ni el número de bodega (el número sigue en la lista del menú)
import React, { useEffect, useRef, useState } from 'react'
import { pickActiveWarehouse, useWarehouses } from '@/features/warehouses'
import { setActiveWarehouse } from '@/features/navigation'
import { selectCurrentUser } from '@/features/auth'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { useClickOutside } from '@/global/hooks/useClickOutside'
import buildingIcon from '@/assets/icons/building.svg'
import { WarehouseMenu } from './WarehouseMenu'
import './WarehouseSelector.css'

export const WarehouseSelector: React.FC = () => {
    const dispatch = useAppDispatch()
    const activeWarehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
    const activeWarehouseName = useAppSelector((state) => state.ui.activeWarehouseName)
    const user = useAppSelector(selectCurrentUser)
    const { warehouses, status } = useWarehouses()
    const [isOpen, setIsOpen] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)
    // ojo: antes el clic fuera y Escape estaban escritos aquí a mano; ahora es el hook compartido
    useClickOutside(wrapperRef, () => setIsOpen(false), isOpen)

    const isAdmin = user?.userType === 'admin'
    const canChangeWarehouse = isAdmin || !user?.warehouseId

    // cuando llegan las bodegas se corrige la activa si la guardada ya no existe (por ejemplo 'WH-01' de versiones anteriores) o cambió de nombre
    useEffect(() => {
        if (status !== 'succeeded') return
        const pick = pickActiveWarehouse(warehouses, activeWarehouseId, user?.warehouseId, isAdmin)
        if (pick && (pick.id !== activeWarehouseId || pick.name !== activeWarehouseName)) {
            dispatch(setActiveWarehouse({ id: pick.id, name: pick.name }))
        }
    }, [status, warehouses, activeWarehouseId, activeWarehouseName, user?.warehouseId, isAdmin, dispatch])

    return (
        <div className="app-header-warehouse-wrapper" ref={wrapperRef}>
            <div className="app-header-warehouse-relative">
                <button
                    type="button"
                    onClick={() => {
                        if (canChangeWarehouse) setIsOpen((prev) => !prev)
                    }}
                    className={`app-header-warehouse-btn ${isOpen ? 'app-header-warehouse-btn-active' : ''}`}
                    aria-expanded={isOpen}
                    aria-haspopup={canChangeWarehouse ? 'listbox' : undefined}
                    style={{ cursor: canChangeWarehouse ? 'pointer' : 'default' }}
                    title={canChangeWarehouse ? 'Cambiar bodega activa' : 'Sede física asignada a tu usuario'}
                >
                    <img src={buildingIcon} alt="" className="app-header-warehouse-icon" aria-hidden="true" />
                    <span className="app-header-warehouse-name">{activeWarehouseName}</span>
                    {canChangeWarehouse && (
                        <span className="app-header-warehouse-chevron" aria-hidden="true">
                            ▾
                        </span>
                    )}
                </button>

                {/* Menú Desplegable Flotante */}
                {isOpen && (
                    <WarehouseMenu
                        warehouses={warehouses}
                        activeWarehouseId={activeWarehouseId}
                        onSelect={(wh) => {
                            dispatch(setActiveWarehouse(wh))
                            setIsOpen(false)
                        }}
                    />
                )}
            </div>
        </div>
    )
}

export default WarehouseSelector
