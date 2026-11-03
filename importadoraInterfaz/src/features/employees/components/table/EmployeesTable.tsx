// EmployeesTable · tabla de empleados: avatar con iniciales, nombre y contacto, cargo, sede, modalidad, estado y acciones con ícono
// conecta con: EmployeesScreen (la usa), employees.types, global format (iniciales) y RowActions (acciones «Ver detalle» (datos y lista de permisos) y «Editar permisos»); estilos en EmployeesTable.css
// ojo: carga y lista vacía se muestran dentro de la misma tabla para que no salte el diseño
import React, { useState } from 'react'
import { getInitials } from '@/global/helpers/formatting/format'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import editIcon from '@/assets/icons/edit.svg?raw'
import refreshIcon from '@/assets/icons/refresh.svg?raw'
import type { SimpleEmployee } from '../../types/employees.types'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { setEmployeeStatusThunk, unlockEmployeeThunk } from '../../thunks/employees.thunks'
import './EmployeesTable.css'
import { usePagedList } from '@/global/hooks/data/usePagedList'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'

interface EmployeesTableProps {
  employees: SimpleEmployee[]
  loading: boolean
  onViewPermissions: (employee: SimpleEmployee) => void
  onEditPermissions: (employee: SimpleEmployee) => void
}

const COLUMNS = 6

export const EmployeesTable: React.FC<EmployeesTableProps> = ({ employees, loading, onViewPermissions, onEditPermissions }) => {
  const dispatch = useAppDispatch()
  const { hasScreenAccess, canPerformAction } = usePermissions()
  const canViewPermissions = hasScreenAccess('settings', 'rolesPermissions')
  const canEditPermissions = canPerformAction('settings', 'rolesPermissions', 'update')
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const message = loading ? 'Cargando directorio de empleados…' : employees.length === 0 ? 'No se encontraron empleados registrados.' : null
  const { pageItems, meta, setPage } = usePagedList(employees, employees.length)

  const handleToggleEmployeeStatus = async (emp: SimpleEmployee) => {
    if (!canEditPermissions || togglingId === emp.employeeId) return
    setTogglingId(emp.employeeId)
    await dispatch(setEmployeeStatusThunk({ employeeId: emp.employeeId, isActive: !emp.isActive }))
    setTogglingId(null)
  }

  return (
    <>
    <div className="employees-table-responsive table-scroll">
      <table className="employees-table">
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Cargo</th>
            <th>Sede</th>
            <th>Modalidad</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {message ? (
            <tr>
              <td colSpan={COLUMNS} className="employees-table-message">{message}</td>
            </tr>
          ) : (
            pageItems.map((employee) => {
              const fullName = `${employee.name} ${employee.lastName || ''}`.trim()
              return (
                <tr key={employee.employeeId} className="employees-table-row">
                  <td>
                    <div className="employees-table-person">
                      <span className="employees-table-avatar" aria-hidden="true">{getInitials(fullName)}</span>
                      <div className="employees-table-person-text">
                        <span className="employees-table-name">{fullName}</span>
                        <span className="employees-table-contact">CC {employee.identification} · {employee.email}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className="employees-table-chip">{employee.roleName || 'Empleado'}</span></td>
                  <td>{employee.warehouseName || `Sede #${employee.primaryWarehouseId || 'General'}`}</td>
                  <td>{employee.workModality || 'Presencial'}</td>
                  <td>
                    <button
                      type="button"
                      className={`inv-status-select ${employee.isActive ? 'is-active' : 'is-inactive'}`}
                      onClick={() => handleToggleEmployeeStatus(employee)}
                      disabled={!canEditPermissions || togglingId === employee.employeeId}
                      title={canEditPermissions ? 'Haz clic para cambiar estado' : undefined}
                    >
                      {employee.isActive ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td>
                    <RowActions
                      actions={[
                        { key: 'view', label: 'Ver detalle', icon: eyeIcon, visible: canViewPermissions, onClick: () => onViewPermissions(employee) },
                        { key: 'edit', label: 'Editar permisos', icon: editIcon, visible: canEditPermissions, onClick: () => onEditPermissions(employee) },
                        { key: 'unlock', label: 'Desbloquear cuenta', icon: refreshIcon, visible: canEditPermissions, onClick: () => dispatch(unlockEmployeeThunk(employee.employeeId)) },
                      ]}
                    />
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
    <Pagination meta={meta} label="Paginación de empleados" onPageChange={setPage} />
    </>
  )
}

export default EmployeesTable
