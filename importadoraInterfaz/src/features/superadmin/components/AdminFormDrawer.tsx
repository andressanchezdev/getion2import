// AdminFormDrawer · formulario de creación / edición de administradores en el panel derecho (solo superadmin)
// conecta con: formRegistry (adminForm), useAdminForm (estado y guardado) y las secciones AdminCompanyFields y AdminPersonFields
// ojo: al editar no se muestra la sección de empresa; al guardar el thunk recarga la lista de la pantalla
import React from 'react'
import { useAdminForm } from '../hooks/useAdminForm'
import type { AdminFormPayload } from '../types/superadmin.types'
import { AdminCompanyFields } from './AdminCompanyFields'
import { AdminPersonFields } from './AdminPersonFields'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './AdminFormDrawer.css'

export const AdminFormDrawer: React.FC<{ payload?: AdminFormPayload }> = ({ payload }) => {
  const form = useAdminForm(payload?.admin)
  return (
    <form className="drawer-form admin-form-drawer" onSubmit={(e) => { e.preventDefault(); form.submit() }}>
      <div className="drawer-form-body">
        {!form.editing && <AdminCompanyFields draft={form.draft} companies={form.companies} setField={form.setField} setCompanyField={form.setCompanyField} />}
        <AdminPersonFields draft={form.draft} editing={form.editing} setField={form.setField} />
      </div>
      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" onClick={form.cancel} disabled={form.saving}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={form.saving}>
          {form.saving ? 'Guardando…' : form.editing ? 'Guardar Cambios' : 'Crear Administrador'}
        </button>
      </div>
    </form>
  )
}

export default AdminFormDrawer
