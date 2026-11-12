// FormDrawerBody · cuerpo del panel derecho cuando hay una acción abierta: pinta el formulario o detalle que dice formRegistry
// conecta con: drawerRegistry (modo «form»), formRegistry, navigation (drawerForm), usePermissions (can) y DrawerFormShell.css
// ojo: guardia del drawer (8.4): si la entrada declara permission y el usuario no cumple ninguna llave se muestra «Sin acceso»;
// el botón que lo abre ya debería estar oculto, esto cubre aperturas por otro camino. La API igual responde 403
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { getFormEntry } from '../formRegistry'

export const FormDrawerBody: React.FC = () => {
  const form = useAppSelector((state) => state.ui.drawerForm)
  const { can } = usePermissions()
  if (!form) return null
  const entry = getFormEntry(form)
  if (entry.permission && !can(...entry.permission)) {
    return (
      <div className="drawer-form">
        <div className="drawer-form-body">
          <p className="drawer-form-note">Sin acceso: tu usuario no tiene permiso para esta acción. Pide al administrador que te lo asigne.</p>
        </div>
      </div>
    )
  }
  return <>{entry.render(form.payload)}</>
}

export default FormDrawerBody
