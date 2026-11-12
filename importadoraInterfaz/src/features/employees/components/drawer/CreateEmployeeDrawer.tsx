// CreateEmployeePanel · formulario lateral para registrar un empleado nuevo dentro de DrawerRight
// conecta con: formRegistry (people.entries), EmployeesScreen, useCreateEmployeeForm y EmployeeFormFields
import React from 'react'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { closeDrawerForm } from '@/features/navigation'
import { useCreateEmployeeForm } from '../../hooks/useCreateEmployeeForm'
import { AssignmentSection, CredentialsSection, PersonalSection } from './EmployeeFormFields'
import './CreateEmployeeDrawer.css'

export const CreateEmployeePanel: React.FC = () => {
  const dispatch = useAppDispatch()
  const form = useCreateEmployeeForm(() => dispatch(closeDrawerForm()))

  return (
    <form className="drawer-form" onSubmit={(e) => { e.preventDefault(); form.submit() }}>
      <div className="drawer-form-body">
        <PersonalSection values={form.values} setValue={form.setValue} />
        <CredentialsSection values={form.values} setValue={form.setValue} />
        <AssignmentSection warehouses={form.warehouses} roles={form.roles} warehouseId={form.warehouseId} roleId={form.roleId} setValue={form.setValue} />
      </div>
      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())} disabled={form.submitting}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={form.submitting}>{form.submitting ? 'Guardando...' : 'Crear Empleado'}</button>
      </div>
    </form>
  )
}

export default CreateEmployeePanel
