// RoleForm · crear o editar un rol en el panel derecho: código (solo al crear), nombre, descripción y, al editar, si está activo
// conecta con: formRegistry (lo muestra), employees.thunks (saveRoleThunk: POST /roles o PUT /roles/:id), navigation (closeDrawerForm) y ValidatedInput
// ojo: el código identifica al rol y no se cambia después; la lista de roles se vuelve a pedir sola cuando el panel se cierra
import React, { useState } from 'react'
import '../permissions/EmployeePermissionsPanel.css'
import { closeDrawerForm } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { ValidatedInput } from '@/global/components/UI/molecules/form'
import { SANITIZERS } from '@/global/helpers/validation/validation.helpers'
import { toast } from '@/global/helpers/feedback/toast'
import { saveRoleThunk } from '../../thunks/employees.thunks'
import type { EmployeeRole } from '../../types/employees.types'

interface RoleFormProps {
  role: EmployeeRole | null // null = rol nuevo
}

export const RoleForm: React.FC<RoleFormProps> = ({ role }) => {
  const dispatch = useAppDispatch()
  const isEdit = role !== null
  const [code, setCode] = useState(role?.code ?? '')
  const [name, setName] = useState(role?.roleName ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [isActive, setIsActive] = useState(role?.isActive !== false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const codeValid = isEdit || /^[a-z0-9_]{2,30}$/.test(code)
  const nameValid = name.trim().length >= 3
  const canSubmit = codeValid && nameValid && !saving

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    const input = isEdit ? { name: name.trim(), description: description.trim(), isActive } : { code, name: name.trim(), description: description.trim() }
    const result = await dispatch(saveRoleThunk({ roleId: role?.roleId, input }))
    setSaving(false)
    if (saveRoleThunk.fulfilled.match(result)) {
      toast.success(isEdit ? 'Rol actualizado' : 'Rol creado')
      dispatch(closeDrawerForm())
    } else {
      setError(result.payload ?? 'No se pudo guardar el rol.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="employee-permissions">
      <div className="employee-permissions-body">
        <ValidatedInput
          id="role-code"
          label="Código (minúsculas, números o guion bajo)"
          value={code}
          onChange={(value) => setCode(value.toLowerCase())}
          sanitize={SANITIZERS.trim}
          maxLength={30}
          disabled={isEdit}
          required
          error={code && !codeValid ? 'Entre 2 y 30 caracteres: a-z, 0-9 o _' : undefined}
          placeholder="Ej: vendedor_mostrador"
        />
        <ValidatedInput
          id="role-name"
          label="Nombre del rol"
          value={name}
          onChange={setName}
          sanitize={SANITIZERS.trim}
          maxLength={60}
          required
          error={name && !nameValid ? 'Mínimo 3 caracteres' : undefined}
          placeholder="Ej: Vendedor de mostrador"
        />
        <ValidatedInput id="role-description" label="Descripción" value={description} onChange={setDescription} maxLength={120} placeholder="Qué hace este rol" />
        {isEdit && (
          <label>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Rol activo
          </label>
        )}
        {error && <div className="form-field-error-msg">{error}</div>}
      </div>

      <div className="employee-permissions-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={!canSubmit}>{saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear rol'}</button>
      </div>
    </form>
  )
}

export default RoleForm
