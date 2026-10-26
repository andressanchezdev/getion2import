// EmployeesScreen · directorio de personal interno, sedes asignadas y cargos laborales
// conecta con: employees.service (POST /employees), Redux (user, warehouses, navigation) y tokens.css
// ojo: el backend no pagina este listado: se trae completo una vez y la búsqueda y el filtro por sede se aplican en pantalla (el filtro de sede es por las sedes del empleado)
import React, { useState, useEffect, useCallback } from 'react'
import { getErrorMessage } from '@/api'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { setActiveSubitem } from '@/features/navigation'
import { fetchEmployeesList } from '../services/employees.service'
import type { SimpleEmployee } from '../types/employees.types'
import './EmployeesScreen.css'

interface Loaded {
  key: string
  employees: SimpleEmployee[]
  error: string | null
}

export const EmployeesScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const warehouses = useAppSelector((state) => state.warehouses.items)
  const [selectedWhId, setSelectedWhId] = useState<number>(0)
  const [search, setSearch] = useState('')
  const [reloadTick, setReloadTick] = useState(0)
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  const companyId = user?.companyId
  const loadKey = `${companyId}:${reloadTick}`
  const reload = useCallback(() => setReloadTick((tick) => tick + 1), [])

  // "cargando" se deduce de que la última respuesta no es de esta carga; así no hay setState síncrono dentro del efecto
  useEffect(() => {
    if (!companyId) return
    let current = true
    fetchEmployeesList(companyId)
      .then((employees) => current && setLoaded({ key: loadKey, employees, error: null }))
      .catch((error) => current && setLoaded({ key: loadKey, employees: [], error: getErrorMessage(error, 'No se pudo cargar el directorio de empleados.') }))
    return () => {
      current = false
    }
  }, [companyId, loadKey])

  const isLoading = Boolean(companyId) && loaded?.key !== loadKey
  const error = loaded?.key === loadKey ? loaded.error : null
  const employees = loaded?.employees ?? []

  const filtered = employees.filter((emp) => {
    if (selectedWhId && !emp.warehouseIds.includes(selectedWhId)) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      emp.name.toLowerCase().includes(q) ||
      (emp.lastName?.toLowerCase().includes(q) ?? false) ||
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
          <select className="employees-select" value={selectedWhId} onChange={(e) => setSelectedWhId(Number(e.target.value))}>
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
        ) : error ? (
          <div className="permissions-empty">
            {error}{' '}
            <button type="button" className="btn-secondary" onClick={reload}>
              Reintentar
            </button>
          </div>
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
                    <strong>
                      {emp.name} {emp.lastName || ''}
                    </strong>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                      CC: {emp.identification} · {emp.email}
                    </div>
                  </td>
                  <td>
                    <span className="transfers-code-chip">{emp.roleName || 'Sin rol'}</span>
                  </td>
                  <td>{emp.warehouseName || 'Sin sede'}</td>
                  <td>{emp.workModality || '—'}</td>
                  <td>
                    <span className={`transfers-badge transfers-badge-${emp.isActive ? 'approved' : 'rejected'}`}>{emp.isActive ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td>
                    <button type="button" className="btn-secondary" onClick={() => dispatch(setActiveSubitem('rolesPermissions'))} title="Gestionar matriz de permisos">
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
