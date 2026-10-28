// EmployeesScreen · directorio de personal interno, sedes asignadas y cargos laborales
// conecta con: employees.service, Redux (user, warehouses, navigation) y tokens.css
import React, { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { setActiveSubitem } from '@/features/navigation'
import { fetchEmployeesList } from '../services/employees.service'
import type { SimpleEmployee } from '../types/employees.types'
import './EmployeesScreen.css'

export const EmployeesScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const warehouses = useAppSelector((state) => state.warehouses.items)
  const [employees, setEmployees] = useState<SimpleEmployee[]>([])
  const [selectedWhId, setSelectedWhId] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user?.companyId) return
    setIsLoading(true)
    fetchEmployeesList(user.companyId, selectedWhId || undefined)
      .then((data) => setEmployees(data))
      .catch(() => setEmployees([]))
      .finally(() => setIsLoading(false))
  }, [user?.companyId, selectedWhId])

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
      <div className="employees-toolbar">
        <div className="employees-search-box">
          <input
            type="text"
            className="employees-input"
            placeholder="Buscar por nombre, cédula o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="employees-filter-wh">
          <select
            className="employees-select"
            value={selectedWhId}
            onChange={(e) => setSelectedWhId(Number(e.target.value))}
          >
            <option value={0}>Todas las Sedes / Bodegas</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="employees-table-card">
        {isLoading ? (
          <div className="permissions-empty">Cargando directorio de empleados...</div>
        ) : filtered.length === 0 ? (
          <div className="permissions-empty">No se encontraron empleados registrados.</div>
        ) : (
          <table className="permissions-table">
            <thead>
              <tr>
                <th>Empleado / Documento</th>
                <th>Cargo / Rol</th>
                <th>Sede Asignada</th>
                <th>Modalidad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp.employeeId}>
                  <td>
                    <strong>{emp.name} {emp.lastName || ''}</strong>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                      CC: {emp.identification} · {emp.email}
                    </div>
                  </td>
                  <td>
                    <span className="transfers-code-chip">{emp.roleName || 'Empleado'}</span>
                  </td>
                  <td>{emp.warehouseName || `Sede #${emp.primaryWarehouseId || 'General'}`}</td>
                  <td>{emp.workModality || 'Presencial'}</td>
                  <td>
                    <span className={`transfers-badge transfers-badge-${emp.isActive ? 'approved' : 'rejected'}`}>
                      {emp.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => dispatch(setActiveSubitem('rolesPermissions'))}
                      title="Gestionar matriz de permisos"
                    >
                      Permisos
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default EmployeesScreen
