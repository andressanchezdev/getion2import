// CreateEmployeeDrawer · formulario lateral para registrar un empleado nuevo (datos, credenciales, sede y rol)
// conecta con: EmployeesScreen (lo abre), useCreateEmployeeForm (estado y envío) y EmployeeFormFields (las secciones)
// ojo: el cuerpo se monta solo al abrir, así cada apertura empieza con el formulario limpio; al crear, el thunk recarga el directorio
import React from 'react'
import { useCreateEmployeeForm } from '../../hooks/useCreateEmployeeForm'
import { AssignmentSection, CredentialsSection, PersonalSection } from './EmployeeFormFields'
import './CreateEmployeeDrawer.css'

const DrawerBody: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const form = useCreateEmployeeForm(onClose)
  return (
    <div className="employee-drawer-overlay" onClick={onClose}>
      <aside className="employee-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="employee-drawer-header">
          <div>
            <h3 className="employee-drawer-title">Registrar Nuevo Empleado</h3>
            <p className="employee-drawer-subtitle">Crea las credenciales de acceso y asigna sede y rol al colaborador</p>
          </div>
          <button type="button" className="employee-drawer-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <form className="employee-drawer-form" onSubmit={(e) => { e.preventDefault(); form.submit() }}>
          <PersonalSection values={form.values} setValue={form.setValue} />
          <CredentialsSection values={form.values} setValue={form.setValue} />
          <AssignmentSection warehouses={form.warehouses} roles={form.roles} warehouseId={form.warehouseId} roleId={form.roleId} setValue={form.setValue} />
          <div className="employee-drawer-footer">
            <button type="button" className="emp-btn-cancel" onClick={onClose} disabled={form.submitting}>Cancelar</button>
            <button type="submit" className="emp-btn-submit" disabled={form.submitting}>{form.submitting ? 'Guardando...' : 'Crear Empleado'}</button>
          </div>
        </form>
      </aside>
    </div>
  )
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export const CreateEmployeeDrawer: React.FC<Props> = ({ isOpen, onClose }) => (isOpen ? <DrawerBody onClose={onClose} /> : null)
export default CreateEmployeeDrawer
