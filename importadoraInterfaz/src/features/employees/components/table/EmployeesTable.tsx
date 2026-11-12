// EmployeesTable · tabla de empleados: nombre y contacto, cargo, sede, modalidad, estado y acciones con ícono
// conecta con: EmployeesScreen (la usa), employees.types, global format (iniciales) y RowActions (acciones «Ver detalle» (datos y lista de permisos) y «Editar permisos»); estilos en EmployeesTable.css
// ojo: carga y lista vacía se muestran dentro de la misma tabla para que no salte el diseño
import React, { useState } from 'react'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { ActionsHeader } from '@/global/components/UI/molecules/table/ActionsHeader'
import { CopyableCell } from '@/global/components/UI/molecules/table/CopyableCell'
import { StatusSelect } from '@/global/components/UI/molecules/table/StatusSelect'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import editIcon from '@/assets/icons/edit.svg?raw'
import type { SimpleEmployee } from '../../types/employees.types'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { setEmployeeStatusThunk } from '../../thunks/employees.thunks'
import './EmployeesTable.css'
import { usePagedList } from '@/global/hooks/data/usePagedList'
import { ReasonPrompt } from '@/features/reasonPrompt'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'

interface EmployeesTableProps {
  employees: SimpleEmployee[]
  loading: boolean
  onViewPermissions: (employee: SimpleEmployee) => void
  onEditPermissions: (employee: SimpleEmployee) => void
}

const COLUMNS = 6

export const EmployeesTable: React.FC<EmployeesTableProps> = ({ employees, loading, onViewPermissions, onEditPermissions }) => {
  const dispatch = useAppDispatch()
  const { hasScreenAccess, can } = usePermissions()
  const canViewPermissions = hasScreenAccess('settings', 'rolesPermissions')
  const canEditPermissions = can('roles:edit')
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const message = loading ? 'Cargando directorio de empleados…' : employees.length === 0 ? 'No se encontraron empleados registrados.' : null
  const { pageItems, meta, setPage } = usePagedList(employees, employees.length)

  const [toDeactivate, setToDeactivate] = useState<SimpleEmployee | null>(null)

  const applyStatus = async (emp: SimpleEmployee, isActive: boolean, reason?: string) => {
    setTogglingId(emp.employeeId)
    await dispatch(setEmployeeStatusThunk({ employeeId: emp.employeeId, isActive, reason }))
    setTogglingId(null)
  }

  return (
    <>
      <DataTable tableId="employees-employees" className="employees-table">
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Cargo</th>
            <th>Sede</th>
            <th>Modalidad</th>
            <th>Estado</th>
            <ActionsHeader />
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
                      <div className="employees-table-person-text">
                        <span className="employees-table-name">{fullName}</span>
                        <span className="employees-table-contact">
                          CC <CopyableCell text={employee.identification} label="Cédula" /> · {employee.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td><span className="employees-table-chip">{employee.roleName || 'Empleado'}</span></td>
                  <td>{employee.warehouseName || `Sede #${employee.primaryWarehouseId || 'General'}`}</td>
                  <td>{employee.workModality || 'Presencial'}</td>
                  <td>
                    <StatusSelect
                      value={employee.isActive ? 'active' : 'inactive'}
                      disabled={!canEditPermissions || togglingId === employee.employeeId}
                      onChange={(next) => {
                        if (next === 'inactive') setToDeactivate(employee)
                        else void applyStatus(employee, true)
                      }}
                    />
                  </td>
                  <td>
                    <RowActions
                      actions={[
                        { key: 'view', label: 'Ver detalle', icon: eyeIcon, visible: canViewPermissions, onClick: () => onViewPermissions(employee) },
                        { key: 'edit', label: 'Editar permisos', icon: editIcon, visible: canEditPermissions, onClick: () => onEditPermissions(employee) },
                      ]}
                    />
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </DataTable>
      <Pagination meta={meta} label="Paginación de empleados" onPageChange={setPage} />
      <ReasonPrompt
        open={Boolean(toDeactivate)}
        title="Desactivar empleado"
        message={`¿Desactivar a "${toDeactivate?.name ?? ''}"? Se cerrarán sus sesiones.`}
        confirmLabel="Desactivar"
        onConfirm={async (reason) => {
          const emp = toDeactivate
          setToDeactivate(null)
          if (emp) await applyStatus(emp, false, reason)
        }}
        onCancel={() => setToDeactivate(null)}
      />
    </>
  )
}

export default EmployeesTable
