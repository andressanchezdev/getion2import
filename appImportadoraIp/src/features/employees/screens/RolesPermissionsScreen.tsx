// RolesPermissionsScreen · matriz interactiva de asignación de roles y permisos por empleado
// conecta con: employees.service, ModulePermissionRow, MENU_ITEMS y usePermissions
// ojo: hoy el backend responde 200 pero con modules VACÍO, así que la matriz no refleja permisos reales. Lo que falta se muestra como solo lectura (nunca como "crear" o "editar") y se avisa.
// Guardar queda DESHABILITADO mientras el servidor no haya devuelto los permisos reales del empleado (sin módulos o con error de carga), para no sobrescribir con una matriz inventada
// ni aplicar la matriz de otro empleado
import React, { useState, useEffect } from 'react'
import './RolesPermissionsScreen.css'
import { getErrorMessage } from '@/api'
import { useAppSelector } from '@/global/hooks/useRedux'
import { MENU_ITEMS } from '@/features/navigation'
import { buildModulesMap } from '../helpers/employees.permissions'
import { fetchEmployeesList, fetchEmployeePermissions, saveEmployeePermissions } from '../services/employees.service'
import { ModulePermissionRow } from './ModulePermissionRow'
import type { ModulePermission, SimpleEmployee } from '../types/employees.types'

export const RolesPermissionsScreen: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth)
  const [employees, setEmployees] = useState<SimpleEmployee[]>([])
  const [selectedEmpId, setSelectedEmpId] = useState(0)
  const [loadedFor, setLoadedFor] = useState(0) // empleado cuyos permisos ya llegaron (o fallaron)
  const [modulesMap, setModulesMap] = useState<Record<string, ModulePermission>>({})
  const [serverHadModules, setServerHadModules] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false) // la carga de los permisos de este empleado falló
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const companyId = user?.companyId
  const isLoading = selectedEmpId !== 0 && loadedFor !== selectedEmpId
  const canSave = selectedEmpId !== 0 && !isLoading && !loadFailed && serverHadModules

  useEffect(() => {
    if (!companyId) return
    fetchEmployeesList(companyId)
      .then((list) => {
        setEmployees(list)
        if (list.length > 0) setSelectedEmpId(list[0].employeeId)
      })
      .catch((error) => setFeedback({ type: 'error', msg: getErrorMessage(error, 'No se pudo cargar la lista de empleados.') }))
  }, [companyId])

  useEffect(() => {
    if (!selectedEmpId) return
    let current = true
    fetchEmployeePermissions(selectedEmpId)
      .then((res) => {
        if (!current) return
        setServerHadModules((res.modules ?? []).length > 0)
        setModulesMap(buildModulesMap(res.modules ?? []))
        setLoadFailed(false)
        setLoadedFor(selectedEmpId)
      })
      .catch((error) => {
        if (!current) return
        setFeedback({ type: 'error', msg: getErrorMessage(error, 'Error al cargar permisos del empleado') })
        setModulesMap({}) // nunca se deja la matriz del empleado anterior
        setServerHadModules(false)
        setLoadFailed(true)
        setLoadedFor(selectedEmpId)
      })
    return () => {
      current = false
    }
  }, [selectedEmpId])

  const handleSave = async () => {
    if (!selectedEmpId || !canSave) return
    try {
      setIsSaving(true)
      setFeedback(null)
      await saveEmployeePermissions(selectedEmpId, Object.values(modulesMap))
      setFeedback({ type: 'success', msg: '¡Matriz de permisos actualizada con éxito en el servidor!' })
    } catch (error) {
      setFeedback({ type: 'error', msg: getErrorMessage(error, 'Error al guardar permisos') })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="permissions-screen">
      <div className="permissions-header-card">
        <div className="permissions-selector-group">
          <label className="permissions-label">Seleccionar Empleado a Configurar</label>
          <select
            className="permissions-select"
            value={selectedEmpId}
            onChange={(e) => {
              setFeedback(null)
              setSelectedEmpId(Number(e.target.value))
            }}
          >
            {employees.map((emp) => (
              <option key={emp.employeeId} value={emp.employeeId}>
                {emp.name} {emp.lastName || ''} ({emp.email} · {emp.identification})
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="btn-primary" disabled={isSaving || !canSave} title={canSave ? undefined : 'No se puede guardar hasta que el servidor devuelva los permisos reales del empleado'} onClick={handleSave}>
          {isSaving ? 'Guardando...' : 'Guardar Matriz de Permisos'}
        </button>
      </div>

      {feedback && <div className={`transfer-serial-alert ${feedback.type === 'error' ? 'form-field-error-msg' : ''}`}>{feedback.msg}</div>}

      {!isLoading && selectedEmpId !== 0 && !serverHadModules && !loadFailed && (
        <div className="transfer-serial-alert" role="status">
          El servidor no devolvió permisos configurados para este empleado. Lo que ves es solo lectura por defecto, no sus permisos reales; por eso no se puede guardar.
        </div>
      )}

      <div className="permissions-matrix-card">
        {isLoading ? (
          <div className="permissions-empty">Cargando permisos del empleado...</div>
        ) : (
          <table className="permissions-table">
            <thead>
              <tr>
                <th>Módulo y Pantalla / Subítem</th>
                <th>Ver (Read)</th>
                <th>Crear (Create)</th>
                <th>Editar (Update)</th>
                <th>Anular (Delete)</th>
              </tr>
            </thead>
            <tbody>
              {MENU_ITEMS.map((item) => {
                const perm = modulesMap[item.id]
                if (!perm) return null
                return <ModulePermissionRow key={item.id} item={item} permission={perm} onChange={(updated) => setModulesMap((prev) => ({ ...prev, [item.id]: updated }))} />
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default RolesPermissionsScreen
