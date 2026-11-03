// useWarehouseForm — estado y guardado del formulario de una bodega (crear o editar) y la lista de empleados para elegir administrador
// conecta con: WarehouseFormPanel (lo usa), warehouses.thunks (saveWarehouseThunk), warehouses.manage (código sugerido), employees (useEmployeesDirectory) y navigation (cierra el panel)
// ojo: código, nombre, ciudad y dirección son obligatorios; al crear el código se autogenera; sin administrador se manda sin asignar
import { useState } from 'react'
import { useEmployeesDirectory } from '@/features/employees'
import { closeDrawerForm } from '@/features/navigation'
import { toast } from '@/global/helpers/feedback/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { suggestWarehouseCode } from '../helpers/warehouses.manage'
import { selectManagedWarehouses, selectWarehousesSaving } from '../selectors/warehouses.selectors'
import { saveWarehouseThunk } from '../thunks/warehouses.thunks'
import type { Warehouse } from '../types/warehouse.types'

export interface WarehouseFormValues {
    code: string
    name: string
    description: string
    city: string
    address: string
    phone: string
    managerEmployeeId: string // '' = sin administrador
}

export const useWarehouseForm = (warehouse?: Warehouse) => {
    const dispatch = useAppDispatch()
    const saving = useAppSelector(selectWarehousesSaving)
    const { managed } = useAppSelector(selectManagedWarehouses)
    const { employees } = useEmployeesDirectory()
    const [values, setValues] = useState<WarehouseFormValues>(() => ({
        code: warehouse?.code ?? suggestWarehouseCode(managed),
        name: warehouse?.name ?? '',
        description: warehouse?.description ?? '',
        city: warehouse?.city ?? '',
        address: warehouse?.address ?? '',
        phone: warehouse?.phone ?? '',
        managerEmployeeId: warehouse?.managerEmployeeId ? String(warehouse.managerEmployeeId) : '',
    }))
    const [error, setError] = useState<string | null>(null)

    const set = <K extends keyof WarehouseFormValues>(field: K, value: WarehouseFormValues[K]) => setValues((prev) => ({ ...prev, [field]: value }))

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        if (saving) return
        const effectiveCode = values.code.trim() || suggestWarehouseCode(managed)
        if (!effectiveCode || !values.name.trim() || !values.city.trim() || !values.address.trim()) {
            setError(warehouse ? 'Código, nombre, ciudad y dirección son obligatorios.' : 'Nombre, ciudad y dirección son obligatorios.')
            return
        }
        setError(null)
        const input = {
            code: effectiveCode.toUpperCase(),
            name: values.name.trim(),
            description: values.description.trim() || undefined,
            city: values.city.trim(),
            address: values.address.trim(),
            phone: values.phone.trim() || undefined,
            managerEmployeeId: values.managerEmployeeId ? Number(values.managerEmployeeId) : undefined,
        }
        const result = await dispatch(saveWarehouseThunk({ id: warehouse?.id, input }))
        if (saveWarehouseThunk.fulfilled.match(result)) {
            toast.success(warehouse ? 'Bodega actualizada' : 'Bodega creada')
            dispatch(closeDrawerForm())
        } else {
            setError(result.payload ?? 'No se pudo guardar la bodega.')
        }
    }

    return { values, set, error, saving, isEdit: Boolean(warehouse), employees, submit, cancel: () => dispatch(closeDrawerForm()) }
}
