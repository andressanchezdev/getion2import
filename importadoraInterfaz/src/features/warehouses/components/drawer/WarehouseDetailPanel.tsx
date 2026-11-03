// WarehouseDetailPanel — panel derecho para ver información detallada de una bodega (sede)
// conecta con: openDrawerForm, closeDrawerForm, Pill, Warehouse
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { closeDrawerForm, openDrawerForm } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import type { Warehouse } from '../../types/warehouse.types'

export interface WarehouseDetailPayload {
    warehouse: Warehouse
    onOpenLocations?: (warehouse: Warehouse) => void
}

export const WarehouseDetailPanel: React.FC<{ payload: WarehouseDetailPayload }> = ({ payload }) => {
    const dispatch = useAppDispatch()
    const { warehouse, onOpenLocations } = payload
    const active = warehouse.isActive !== false

    return (
        <div className="drawer-form">
            <div className="drawer-form-body">
                <section className="drawer-form-section">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Código: {warehouse.code || '—'}</span>
                        <Pill tone={active ? 'green' : 'amber'}>{active ? 'Activa' : 'Inactiva'}</Pill>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>{warehouse.name}</h3>
                    {warehouse.description && <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', margin: 0 }}>{warehouse.description}</p>}
                </section>

                <section className="drawer-form-section">
                    <h4 className="drawer-form-section-title">Ubicación y Contacto</h4>
                    <div className="drawer-form-grid">
                        <div className="drawer-form-field">
                            <span className="drawer-form-label">Ciudad</span>
                            <strong style={{ fontSize: '0.95rem' }}>{warehouse.city || '—'}</strong>
                        </div>
                        <div className="drawer-form-field">
                            <span className="drawer-form-label">Teléfono</span>
                            <strong style={{ fontSize: '0.95rem' }}>{warehouse.phone || '—'}</strong>
                        </div>
                    </div>
                    <div className="drawer-form-field" style={{ marginTop: '0.5rem' }}>
                        <span className="drawer-form-label">Dirección</span>
                        <strong style={{ fontSize: '0.95rem' }}>{warehouse.address || '—'}</strong>
                    </div>
                </section>

                <section className="drawer-form-section">
                    <h4 className="drawer-form-section-title">Operación y Administración</h4>
                    <div className="drawer-form-field">
                        <span className="drawer-form-label">Administrador a cargo</span>
                        <strong style={{ fontSize: '0.95rem' }}>{warehouse.managerName || 'Sin administrador asignado (operación libre)'}</strong>
                    </div>
                    <div className="drawer-form-grid" style={{ marginTop: '0.75rem' }}>
                        <div className="drawer-form-field">
                            <span className="drawer-form-label">Estantes / Ubicaciones</span>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--primary-color)' }}>{warehouse.locationCount ?? 0}</strong>
                        </div>
                        <div className="drawer-form-field">
                            <span className="drawer-form-label">SKUs con existencias</span>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--primary-color)' }}>{warehouse.skuCount ?? 0}</strong>
                        </div>
                    </div>
                </section>
            </div>

            <div className="drawer-form-footer">
                <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>
                    Cerrar
                </button>
                {onOpenLocations && (
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                            dispatch(closeDrawerForm())
                            onOpenLocations(warehouse)
                        }}
                    >
                        Ver ubicaciones
                    </button>
                )}
                <button
                    type="button"
                    className="btn-primary"
                    onClick={() => dispatch(openDrawerForm({ kind: 'warehouseForm', payload: { warehouse } }))}
                >
                    Editar sede
                </button>
            </div>
        </div>
    )
}

export default WarehouseDetailPanel

