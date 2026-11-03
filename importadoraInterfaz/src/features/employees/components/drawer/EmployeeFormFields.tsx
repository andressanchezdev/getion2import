// EmployeeFormFields · las tres secciones del formulario de empleado: datos personales, credenciales y sede con rol
// conecta con: CreateEmployeeDrawer; los valores y cambios vienen de useCreateEmployeeForm
import React from 'react'
import type { EmployeeFormValues } from '../../hooks/useCreateEmployeeForm'
import type { EmployeeRole } from '../../types/employees.types'

type Setter = <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) => void

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  minLength?: number
}

const TextField: React.FC<TextFieldProps> = ({ label, value, onChange, type = 'text', placeholder, required, minLength }) => (
  <div className="emp-form-field">
    <label>{label}</label>
    <input type={type} required={required} minLength={minLength} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
)

export const PersonalSection: React.FC<{ values: EmployeeFormValues; setValue: Setter }> = ({ values, setValue }) => (
  <div className="emp-form-section">
    <h4 className="emp-form-section-title">Datos Personales</h4>
    <div className="emp-form-row two-cols">
      <TextField label="Nombre(s) *" required placeholder="Ej. Juan Andrés" value={values.firstName} onChange={(v) => setValue('firstName', v)} />
      <TextField label="Apellidos" placeholder="Ej. Pérez Gómez" value={values.lastName} onChange={(v) => setValue('lastName', v)} />
    </div>
    <div className="emp-form-row two-cols">
      <div className="emp-form-field">
        <label>Tipo Documento</label>
        <select value={values.documentType} onChange={(e) => setValue('documentType', e.target.value as EmployeeFormValues['documentType'])}>
          <option value="CC">Cédula de Ciudadanía (CC)</option>
          <option value="CE">Cédula de Extranjería (CE)</option>
          <option value="NIT">NIT</option>
          <option value="PA">Pasaporte (PA)</option>
        </select>
      </div>
      <TextField label="Número de Documento" placeholder="Ej. 1004260999" value={values.document} onChange={(v) => setValue('document', v)} />
    </div>
    <div className="emp-form-row two-cols">
      <TextField label="Teléfono / Celular" placeholder="Ej. 3120005544" value={values.phone} onChange={(v) => setValue('phone', v)} />
      <div className="emp-form-field">
        <label>Modalidad</label>
        <select value={values.workModality} onChange={(e) => setValue('workModality', e.target.value as EmployeeFormValues['workModality'])}>
          <option value="onsite">Presencial</option>
          <option value="remote">Remoto</option>
          <option value="hybrid">Híbrido</option>
        </select>
      </div>
    </div>
  </div>
)

export const CredentialsSection: React.FC<{ values: EmployeeFormValues; setValue: Setter }> = ({ values, setValue }) => (
  <div className="emp-form-section">
    <h4 className="emp-form-section-title">Credenciales & Acceso</h4>
    <div className="emp-form-row two-cols">
      <TextField label="Correo Electrónico (Usuario) *" type="email" required placeholder="colaborador@empresa.com" value={values.email} onChange={(v) => setValue('email', v)} />
      <TextField label="Contraseña Inicial (mín. 8 caracteres) *" type="password" required minLength={8} placeholder="••••••••" value={values.password} onChange={(v) => setValue('password', v)} />
    </div>
  </div>
)

interface AssignmentProps {
  warehouses: Array<{ id: string | number; name: string; code?: string }>
  roles: EmployeeRole[]
  warehouseId: number
  roleId: number
  setValue: Setter
}

export const AssignmentSection: React.FC<AssignmentProps> = ({ warehouses, roles, warehouseId, roleId, setValue }) => (
  <div className="emp-form-section">
    <h4 className="emp-form-section-title">Sede & Rol Asignado</h4>
    <div className="emp-form-row two-cols">
      <div className="emp-form-field">
        <label>Sede / Bodega Operativa</label>
        <select value={warehouseId} onChange={(e) => setValue('warehouseId', Number(e.target.value))}>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code || `B-${w.id}`})</option>)}
        </select>
      </div>
      <div className="emp-form-field">
        <label>Rol de Usuario</label>
        <select value={roleId} onChange={(e) => setValue('roleId', Number(e.target.value))}>
          {roles.map((r) => <option key={r.roleId} value={r.roleId}>{r.roleName}</option>)}
        </select>
      </div>
    </div>
  </div>
)
