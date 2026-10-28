// RolesPermissionsScreen · matriz interactiva de asignación de roles y permisos por empleado
// conecta con: employees.service, ModulePermissionRow, MENU_ITEMS y usePermissions
import React, { useState, useEffect } from 'react'
import './RolesPermissionsScreen.css'
import { useAppSelector } from '@/global/hooks/useRedux'
import { MENU_ITEMS } from '@/features/navigation'
import {
  fetchEmployeesList,
  fetchEmployeePermissions,
  saveEmployeePermissions,
} from '../services/employees.service'
import { ModulePermissionRow } from './ModulePermissionRow'
import type { ModulePermission, SimpleEmployee } from '../types/employees.types'

export const RolesPermissionsScreen: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth)
  const [employees, setEmployees] = useState<SimpleEmployee[]>([])
  const [selectedEmpId, setSelectedEmpId] = useState(0)
  const [modulesMap, setModulesMap] = useState<Record<string, ModulePermission>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    if (!user?.companyId) return
    fetchEmployeesList(user.companyId)
      .then((list) => {
        setEmployees(list)
        if (list.length > 0) setSelectedEmpId(list[0].employeeId)
      })
      .catch(() => setEmployees([]))
  }, [user?.companyId])

  useEffect(() => {
    if (!selectedEmpId) return
    setIsLoading(true)
    setFeedback(null)
    fetchEmployeePermissions(selectedEmpId)
      .then((res) => {
        const nextMap: Record<string, ModulePermission> = {}
        MENU_ITEMS.forEach((m) => {
          const found = res.modules?.find((item) => item.moduleKey === m.id)
          nextMap[m.id] = found || {
            moduleKey: m.id,
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: false,
            screens: m.subitems.map((sub) => ({
              screenKey: sub.id,
              canRead: true,
              canCreate: true,
              canUpdate: true,
              canDelete: false,
            })),
          }
        })
        setModulesMap(nextMap)
      })
      .catch(() => setFeedback({ type: 'error', msg: 'Error al cargar permisos del empleado' }))
      .finally(() => setIsLoading(false))
  }, [selectedEmpId])

  const handleSave = async () => {
    if (!selectedEmpId) return
    try {
      setIsSaving(true)
      setFeedback(null)
      await saveEmployeePermissions(selectedEmpId, Object.values(modulesMap))
      setFeedback({ type: 'success', msg: '¡Matriz de permisos actualizada con éxito en el servidor!' })
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Error al guardar permisos' })
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
            onChange={(e) => setSelectedEmpId(Number(e.target.value))}
          >
            {employees.map((emp) => (
              <option key={emp.employeeId} value={emp.employeeId}>
                {emp.name} {emp.lastName || ''} ({emp.email} · {emp.identification})
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn-primary"
          disabled={isSaving || !selectedEmpId || isLoading}
          onClick={handleSave}
        >
          {isSaving ? 'Guardando...' : 'Guardar Matriz de Permisos'}
        </button>
      </div>

      {feedback && (
        <div className={`transfer-serial-alert ${feedback.type === 'error' ? 'form-field-error-msg' : ''}`}>
          {feedback.msg}
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
                return (
                  <ModulePermissionRow
                    key={item.id}
                    item={item}
                    permission={perm}
                    onChange={(updated) =>
                      setModulesMap((prev) => ({ ...prev, [item.id]: updated }))
                    }
                  />
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default RolesPermissionsScreen
