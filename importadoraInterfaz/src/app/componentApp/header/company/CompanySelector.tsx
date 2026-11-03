// CompanySelector · botón del header que muestra la compañía activa y abre el menú para saltar a otra (solo el superadmin lo ve)
// conecta con: features/companies (lista del backend), navigation (setActiveCompany, compañía activa), auth (tipo de usuario) y global useClickOutside
// ojo: reutiliza las clases del selector de bodega (app-header-warehouse-*) para verse igual; al elegir otra compañía rootReducer borra los datos de las demás features
// ojo: la opción «Todas las compañías» (id 0) deja al superadmin viendo el conjunto, donde la API lo permite
import React, { useRef, useState } from 'react'
import { useCompanies } from '@/features/companies'
import { ALL_COMPANIES_LABEL, setActiveCompany } from '@/features/navigation'
import { selectCurrentUser } from '@/features/auth'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { canLevelSee, getActorLevel } from '@/global/helpers/access/accessLevels'
import { useClickOutside } from '@/global/hooks/ui/useClickOutside'
import buildingIcon from '@/assets/icons/building.svg'

export const CompanySelector: React.FC = () => {
    const dispatch = useAppDispatch()
    const user = useAppSelector(selectCurrentUser)
    const activeCompanyId = useAppSelector((state) => state.ui.activeCompanyId ?? 0)
    const activeCompanyName = useAppSelector((state) => state.ui.activeCompanyName ?? ALL_COMPANIES_LABEL)
    const isSuperadmin = canLevelSee(getActorLevel(user?.userType), 'companySwitch')
    const { companies, status, error } = useCompanies(isSuperadmin)
    const [isOpen, setIsOpen] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)
    useClickOutside(wrapperRef, () => setIsOpen(false), isOpen)

    if (!isSuperadmin) return null

    const choose = (id: number, name: string) => {
        if (id !== activeCompanyId) dispatch(setActiveCompany({ id, name }))
        setIsOpen(false)
    }

    const options = [{ id: 0, name: ALL_COMPANIES_LABEL }, ...companies.map((company) => ({ id: company.id, name: company.name }))]

    return (
        <div className="app-header-warehouse-wrapper" ref={wrapperRef}>
            <div className="app-header-warehouse-relative">
                <button
                    type="button"
                    onClick={() => setIsOpen((prev) => !prev)}
                    className={`app-header-warehouse-btn ${isOpen ? 'app-header-warehouse-btn-active' : ''}`}
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    title="Cambiar de compañía"
                >
                    <img src={buildingIcon} alt="" className="app-header-warehouse-icon" aria-hidden="true" />
                    <span className="app-header-warehouse-name">{activeCompanyName}</span>
                    <span className="app-header-warehouse-chevron" aria-hidden="true">▾</span>
                </button>

                {isOpen && (
                    <div className="app-header-warehouse-menu" role="listbox" aria-label="Compañías registradas">
                        {status === 'loading' && <div className="app-header-warehouse-menu-empty">Cargando compañías…</div>}
                        {status === 'failed' && <div className="app-header-warehouse-menu-empty">{error}</div>}
                        {options.map((option) => {
                            const isSelected = option.id === activeCompanyId
                            return (
                                <button
                                    type="button"
                                    key={option.id}
                                    onClick={() => choose(option.id, option.name)}
                                    className={`app-header-warehouse-menu-item ${isSelected ? 'app-header-warehouse-menu-item-selected' : ''}`}
                                    role="option"
                                    aria-selected={isSelected}
                                >
                                    <span className="app-header-warehouse-menu-item-name">
                                        {isSelected ? '✔ ' : ''}
                                        {option.name}
                                    </span>
                                    {option.id > 0 && <small className="app-header-warehouse-menu-item-id">#{option.id}</small>}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default CompanySelector
