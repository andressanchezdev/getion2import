// EmployeesScreen · directorio de empleados (la gestión de sedes es otra pantalla, solo para el administrador); el ojo abre el detalle (datos y lista de permisos) y editar permisos abre la matriz; ambos en el panel derecho
// conecta con: employees.service, EmployeesTable, global SearchBar (con su botón de limpiar integrado) y FilterSelect, Redux (user, warehouses, navigation) y tokens.css
import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { openDrawerForm } from '@/features/navigation'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { Icon } from '@/global/components/UI/atoms/Icon'
import plusIcon from '@/assets/icons/plus.svg?raw'
import { FilterSelect } from '@/global/components/UI/molecules/filters/FilterSelect'
import { EmployeesTable } from '../components/table/EmployeesTable'
import { useEmployeesDirectory } from '../hooks/useEmployeesDirectory'
import './EmployeesScreen.css'

export const EmployeesScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const warehouses = useAppSelector((state) => state.warehouses.items)
  const [selectedWhId, setSelectedWhId] = useState<number>(0)
  const [search, setSearch] = useState('')
  const { employees, loading: isLoading } = useEmployeesDirectory(selectedWhId || undefined)

  const filtered = employees.filter((emp) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      emp.name.toLowerCase().includes(q) ||
      (emp.lastName && emp.lastName.toLowerCase().includes(q)) ||
      emp.identification.includes(q) ||
      emp.email.toLowerCase().includes(q)
    )
  })

  return (
    <div className="employees-screen">
      <div className="data-card">
        <div className="data-toolbar employees-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            hasActiveFilters={search !== '' || selectedWhId !== 0}
            onClear={() => {
              setSearch('')
              setSelectedWhId(0)
            }}
            placeholder="Buscar por nombre, cédula o correo..."
            className="employees-search"
          />
          <FilterSelect
            label="Filtrar por sede"
            emptyValue="0"
            value={String(selectedWhId)}
            options={warehouses.map((w) => ({ value: String(w.id), label: w.name }))}
            onChange={(value) => setSelectedWhId(Number(value))}
          />
          <div className="employees-toolbar-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => dispatch(openDrawerForm({ kind: 'createEmployee' }))}
            >
              <Icon svg={plusIcon} /> Registrar Empleado
            </button>
          </div>
        </div>

        <EmployeesTable
          employees={filtered}
          loading={isLoading}
          onViewPermissions={(employee) => dispatch(openDrawerForm({ kind: 'employeeDetail', payload: employee }))}
          onEditPermissions={(employee) => dispatch(openDrawerForm({ kind: 'employeePermissions', payload: { employee, mode: 'edit' } }))}
        />
      </div>
    </div>
  )
}

export default EmployeesScreen
