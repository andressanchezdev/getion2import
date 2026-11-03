// useCreateEmployeeForm · estado y envío del formulario «Registrar empleado»: valores, validación mínima y creación
// conecta con: CreateEmployeeDrawer y EmployeeFormFields; despacha employees.thunks (createEmployeeThunk) y pide los roles con useRoles
// ojo: el cuerpo del drawer se monta solo al abrir (formulario limpio cada vez); la bodega y el rol arrancan en la primera de cada lista
import { useState } from 'react'
import { notify } from '@/global/helpers/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectWarehouses } from '@/features/warehouses'
import { createEmployeeThunk } from '../thunks/employees.thunks'
import type { NewEmployeeInput } from '../types/employees.types'
import { useRoles } from './useRoles'

const MIN_PASSWORD_LENGTH = 8

export interface EmployeeFormValues {
  firstName: string
  lastName: string
  email: string
  password: string
  documentType: NewEmployeeInput['documentType']
  document: string
  phone: string
  workModality: NewEmployeeInput['workModality']
  warehouseId: number | null // null = la primera bodega de la lista
  roleId: number | null // null = el primer rol de la lista
}

const EMPTY: EmployeeFormValues = {
  firstName: '', lastName: '', email: '', password: '', documentType: 'CC', document: '', phone: '', workModality: 'onsite', warehouseId: null, roleId: null,
}

export const useCreateEmployeeForm = (onClose: () => void) => {
  const dispatch = useAppDispatch()
  const warehouses = useAppSelector(selectWarehouses)
  const { roles } = useRoles()
  const [values, setValues] = useState<EmployeeFormValues>(EMPTY)
  const [submitting, setSubmitting] = useState(false)

  const setValue = <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) => setValues((prev) => ({ ...prev, [key]: value }))
  const warehouseId = values.warehouseId ?? Number(warehouses[0]?.id ?? 0)
  const activeRoles = roles.filter((role) => role.isActive !== false)
  const roleId = values.roleId ?? activeRoles[0]?.roleId ?? 0

  const submit = async () => {
    if (!values.firstName.trim() || !values.email.trim() || !values.password.trim()) return notify.error('Nombre, correo y contraseña son obligatorios.')
    if (values.password.length < MIN_PASSWORD_LENGTH) return notify.error(`La contraseña debe tener mínimo ${MIN_PASSWORD_LENGTH} caracteres.`)
    if (!roleId || !warehouseId) return notify.error('Elige la sede y el rol del empleado.')
    setSubmitting(true)
    const result = await dispatch(
      createEmployeeThunk({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password,
        documentType: values.documentType,
        document: values.document.trim() || undefined,
        phone: values.phone.trim() || undefined,
        warehouseId,
        roleId,
        workModality: values.workModality,
      })
    )
    setSubmitting(false)
    if (createEmployeeThunk.fulfilled.match(result)) onClose()
  }

  return { values, setValue, warehouses, roles: activeRoles, warehouseId, roleId, submitting, submit }
}
