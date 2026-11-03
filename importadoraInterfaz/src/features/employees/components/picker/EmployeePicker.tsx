// EmployeePicker · lista de empleados con búsqueda para elegir de quién ver o editar los permisos; cada fila abre el panel derecho
// conecta con: PermissionsHub (lo usa), useEmployeesDirectory (empleados), global SearchBar y RowActions, y navigation (openDrawerForm)
// ojo: el modo decide la acción de cada fila: «view» abre los permisos en solo lectura y «edit» con botón Guardar
import React, { useState } from 'react'
import './EmployeePicker.css'
import { openDrawerForm } from '@/features/navigation'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import editIcon from '@/assets/icons/edit.svg?raw'
import { useEmployeesDirectory } from '../../hooks/useEmployeesDirectory'
import type { EmployeePermissionsMode } from '../permissions/EmployeePermissionsPanel'

interface EmployeePickerProps {
  mode: EmployeePermissionsMode
}

export const EmployeePicker: React.FC<EmployeePickerProps> = ({ mode }) => {
  const dispatch = useAppDispatch()
  const { employees, loading } = useEmployeesDirectory()
  const [search, setSearch] = useState('')

  const needle = search.trim().toLowerCase()
  const visible = employees.filter(
    (employee) => !needle || `${employee.name} ${employee.lastName ?? ''} ${employee.email} ${employee.identification}`.toLowerCase().includes(needle)
  )
  const message = loading ? 'Cargando empleados…' : visible.length === 0 ? 'No se encontraron empleados.' : null
  const isEdit = mode === 'edit'

  return (
    <div className="employee-picker">
      <div className="employee-picker-toolbar">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar empleado por nombre, cédula o correo..." className="employee-picker-search" />
      </div>
      <table className="employee-picker-table">
        <thead>
          <tr><th>Empleado</th><th>Cargo</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {message ? (
            <tr><td colSpan={3} className="employee-picker-message">{message}</td></tr>
          ) : (
            visible.map((employee) => (
              <tr key={employee.employeeId}>
                <td>
                  <strong>{`${employee.name} ${employee.lastName ?? ''}`.trim()}</strong>
                  <small>{employee.email}</small>
                </td>
                <td>{employee.roleName || 'Empleado'}</td>
                <td>
                  <RowActions
                    actions={[
                      {
                        key: mode,
                        label: isEdit ? 'Editar permisos' : 'Ver detalle',
                        icon: isEdit ? editIcon : eyeIcon,
                        onClick: () => dispatch(isEdit ? openDrawerForm({ kind: 'employeePermissions', payload: { employee, mode } }) : openDrawerForm({ kind: 'employeeDetail', payload: employee })),
                      },
                    ]}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default EmployeePicker
