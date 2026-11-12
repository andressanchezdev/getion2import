// CompanyWarehousesPanel · lista de sedes de una compañía en el panel derecho (solo lectura): nombre, código, dirección y estado
// conecta con: formRegistry (lo muestra), warehouses.thunks (loadCompanyWarehousesThunk) y navigation (closeDrawerForm)
// ojo: la lista es local del panel (no toca la lista de bodegas de la compañía activa)
import React, { useEffect, useState } from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './CompanyWarehousesPanel.css'
import { closeDrawerForm } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { loadCompanyWarehousesThunk } from '../thunks/warehouses.thunks'
import type { Warehouse } from '../types/warehouse.types'

interface CompanyWarehousesPanelProps {
    company: { id: number; name: string }
}

export const CompanyWarehousesPanel: React.FC<CompanyWarehousesPanelProps> = ({ company }) => {
    const dispatch = useAppDispatch()
    const [sites, setSites] = useState<Warehouse[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        dispatch(loadCompanyWarehousesThunk(company.id)).then((result) => {
            if (cancelled) return
            if (loadCompanyWarehousesThunk.fulfilled.match(result)) setSites(result.payload)
            else setError(result.payload ?? 'No se pudieron cargar las sedes.')
        })
        return () => {
            cancelled = true
        }
    }, [dispatch, company.id])

    return (
        <div className="drawer-form company-sites">
            <div className="drawer-form-body company-sites-body">
                <p className="company-sites-title">Sedes de <strong>{company.name}</strong></p>
                {error && <div className="form-field-error-msg">{error}</div>}
                {!error && sites === null && <p className="company-sites-empty">Cargando sedes…</p>}
                {sites && sites.length === 0 && <p className="company-sites-empty">Esta compañía no tiene sedes registradas.</p>}
                {sites && sites.length > 0 && (
                    <ul className="company-sites-list">
                        {sites.map((site) => (
                            <li key={site.id} className="company-sites-item">
                                <div>
                                    <strong>{site.name}</strong>
                                    <small>{[site.code, site.address].filter(Boolean).join(' · ') || '—'}</small>
                                </div>
                                <span className={site.isActive === false ? 'company-sites-off' : 'company-sites-on'}>{site.isActive === false ? 'Inactiva' : 'Activa'}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="drawer-form-footer company-sites-footer">
                <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>Cerrar</button>
            </div>
        </div>
    )
}

export default CompanyWarehousesPanel
