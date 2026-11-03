// FormDrawerBody · cuerpo del panel derecho cuando hay una acción abierta: pinta el formulario o detalle que dice formRegistry
// conecta con: drawerRegistry (modo «form»), formRegistry y navigation (drawerForm)
import React from 'react'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { getFormEntry } from '../formRegistry'

export const FormDrawerBody: React.FC = () => {
  const form = useAppSelector((state) => state.ui.drawerForm)
  return form ? <>{getFormEntry(form).render(form.payload)}</> : null
}

export default FormDrawerBody
