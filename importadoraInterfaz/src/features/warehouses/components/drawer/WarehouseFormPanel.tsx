// WarehouseFormPanel — formulario en el panel derecho para crear o editar una bodega (sede): datos, ubicación y contacto, y administrador
// conecta con: useWarehouseForm (estado, empleados y guardado) y DrawerFormShell.css (armazón); lo abre formRegistry ('warehouseForm')
// ojo: al crear no se pide código (se asigna por defecto); al editar se muestra y permite modificarlo
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import { useWarehouseForm, type WarehouseFormValues } from '../../hooks/useWarehouseForm'
import type { Warehouse } from '../../types/warehouse.types'

export interface WarehouseFormPayload {
    warehouse?: Warehouse // si llega, se edita; si no, se crea
}

export const WarehouseFormPanel: React.FC<{ payload: WarehouseFormPayload }> = ({ payload }) => {
    const form = useWarehouseForm(payload.warehouse)
    const { values, set, saving } = form

    const text = (field: keyof WarehouseFormValues, label: string, placeholder: string, extra: { required?: boolean; hint?: string; upper?: boolean } = {}) => (
        <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor={`warehouse-${field}`}>{label}{extra.required ? ' *' : ''}</label>
            <input
                id={`warehouse-${field}`}
                className="drawer-form-control"
                value={values[field]}
                onChange={(e) => set(field, extra.upper ? e.target.value.toUpperCase() : e.target.value)}
                placeholder={placeholder}
                disabled={saving}
                required={extra.required}
            />
            {extra.hint && <span className="drawer-form-hint">{extra.hint}</span>}
        </div>
    )

    return (
        <form className="drawer-form" onSubmit={form.submit}>
            <div className="drawer-form-body">
                {form.error && <div className="form-field-error-msg">{form.error}</div>}

                <section className="drawer-form-section">
                    <div className="drawer-form-grid">
                        {text('code', 'Código', 'Ej: B-01', { required: true, upper: true, hint: form.isEdit ? 'Identifica la bodega en traslados y stock.' : 'Código sugerido automáticamente.' })}
                        {text('name', 'Nombre de la sede', 'Ej: Bodega Principal', { required: true })}
                    </div>
                    <div className="drawer-form-field">
                        <label className="drawer-form-label" htmlFor="warehouse-description">Descripción</label>
                        <textarea id="warehouse-description" className="drawer-form-control" rows={2} value={values.description} onChange={(e) => set('description', e.target.value)} placeholder="Ej: Recepción mayorista y distribución" disabled={saving} />
                    </div>
                </section>

                <section className="drawer-form-section">
                    <div className="drawer-form-grid">
                        {text('city', 'Ciudad', 'Ej: Cali', { required: true })}
                        {text('phone', 'Teléfono', 'Ej: 3001234567')}
                    </div>
                    {text('address', 'Dirección', 'Ej: Calle 15 # 22-45', { required: true })}
                </section>

                <section className="drawer-form-section">
                    <div className="drawer-form-field">
                        <label className="drawer-form-label" htmlFor="warehouse-managerEmployeeId">Administrador de la sede</label>
                        <select id="warehouse-managerEmployeeId" className="drawer-form-control" value={values.managerEmployeeId} onChange={(e) => set('managerEmployeeId', e.target.value)} disabled={saving}>
                            <option value="">Sin administrador (operación libre)</option>
                            {form.employees.map((employee) => (
                                <option key={employee.employeeId} value={employee.employeeId}>
                                    {employee.name} {employee.lastName ?? ''} — {employee.roleName ?? 'Personal'}
                                </option>
                            ))}
                        </select>
                        <span className="drawer-form-hint">Supervisa el inventario y los traslados de esta sede.</span>
                    </div>
                </section>
            </div>

            <div className="drawer-form-footer">
                <button type="button" className="btn-secondary" disabled={saving} onClick={form.cancel}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Guardando…' : form.isEdit ? 'Guardar cambios' : 'Crear bodega'}
                </button>
            </div>
        </form>
    )
}

export default WarehouseFormPanel
