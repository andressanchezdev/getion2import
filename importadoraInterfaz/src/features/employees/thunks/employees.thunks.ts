// employees.thunks · carga la lista de empleados y de roles, registra un empleado, cambia su estado, guarda un rol, y carga y guarda los permisos de un empleado
// conecta con: employees.service (llamadas) y auth (selectRequestContext); las despachan useEmployeesDirectory, useRoles, useEmployeePermissions, useCreateEmployeeForm, EmployeesTable y RoleForm
// ojo: la lista de empleados lleva su requestId y el slice descarta las respuestas de cargas anteriores; los permisos de un empleado no van al slice (son el borrador del panel)
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { toast } from '@/global/helpers/feedback/toast'
import { createEmployee, createRole, fetchEmployeePermissions, fetchEmployeesList, fetchRolesList, saveEmployeePermissions, setEmployeeStatus, unlockEmployee, updateRole } from '../services/employees.service'
import type { EmployeePermissionsResponse, EmployeeRole, ModulePermission, EmployeesState, NewEmployeeInput, RoleInput, SimpleEmployee } from '../types/employees.types'

type ThunkState = { auth: AuthState; ui?: { activeCompanyId?: number } }
const NO_SESSION = 'No hay una sesión activa.'

// los empleados de la compañía activa; con warehouseId solo los de esa bodega
export const loadEmployeesThunk = createAsyncThunk<SimpleEmployee[], number | undefined, { state: ThunkState; rejectValue: string }>(
  'employees/loadList',
  async (warehouseId, { getState, rejectWithValue }) => {
    const ctx = selectRequestContext(getState())
    if (!ctx) return rejectWithValue(NO_SESSION)
    try {
      return await fetchEmployeesList(ctx.companyId, warehouseId)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los empleados.'))
    }
  }
)

export const loadRolesThunk = createAsyncThunk<EmployeeRole[], void, { rejectValue: string }>('employees/loadRoles', async (_, { rejectWithValue }) => {
  try {
    return await fetchRolesList()
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los roles.'))
  }
})

// crea (sin roleId) o edita un rol y vuelve a pedir la lista
export const saveRoleThunk = createAsyncThunk<void, { roleId?: number; input: RoleInput }, { rejectValue: string }>(
  'employees/saveRole',
  async ({ roleId, input }, { dispatch, rejectWithValue }) => {
    try {
      if (roleId) await updateRole(roleId, input)
      else await createRole(input)
      await dispatch(loadRolesThunk())
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo guardar el rol.'))
    }
  }
)

export const loadEmployeePermissionsThunk = createAsyncThunk<EmployeePermissionsResponse, number, { rejectValue: string }>(
  'employees/loadPermissions',
  async (employeeId, { rejectWithValue }) => {
    try {
      return await fetchEmployeePermissions(employeeId)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Error al cargar permisos del empleado'))
    }
  }
)

export const saveEmployeePermissionsThunk = createAsyncThunk<void, { employeeId: number; modules: ModulePermission[] }, { rejectValue: string }>(
  'employees/savePermissions',
  async ({ employeeId, modules }, { rejectWithValue }) => {
    try {
      await saveEmployeePermissions(employeeId, modules)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Error al guardar permisos'))
    }
  }
)

// registra un empleado, avisa y vuelve a pedir el directorio con la misma bodega que tenía
export const createEmployeeThunk = createAsyncThunk<void, NewEmployeeInput, { state: ThunkState & { employees: EmployeesState }; rejectValue: string }>(
  'employees/create',
  async (input, { dispatch, getState, rejectWithValue }) => {
    try {
      await createEmployee(input)
      toast.success('Empleado registrado exitosamente.')
      await dispatch(loadEmployeesThunk(getState().employees.directory.warehouseId))
    } catch (error) {
      const message = getErrorMessage(error, 'Error al registrar el empleado.')
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

// activa o desactiva un empleado; devuelve el id y el estado para que el slice actualice la fila
export const setEmployeeStatusThunk = createAsyncThunk<{ employeeId: number; isActive: boolean }, { employeeId: number; isActive: boolean }, { rejectValue: string }>(
  'employees/setStatus',
  async ({ employeeId, isActive }, { rejectWithValue }) => {
    try {
      await setEmployeeStatus(employeeId, isActive ? 'active' : 'inactive')
      toast.success(`Empleado marcado como ${isActive ? 'Activo' : 'Inactivo'}`)
      return { employeeId, isActive }
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo actualizar el estado del empleado'))
      return rejectWithValue('No se pudo actualizar el estado del empleado')
    }
  }
)

// desbloquea la cuenta del empleado
export const unlockEmployeeThunk = createAsyncThunk<number, number, { rejectValue: string }>(
  'employees/unlock',
  async (employeeId, { rejectWithValue }) => {
    try {
      await unlockEmployee(employeeId)
      toast.success('Cuenta del empleado desbloqueada exitosamente')
      return employeeId
    } catch (error) {
      const msg = getErrorMessage(error, 'No se pudo desbloquear la cuenta del empleado.')
      toast.error(msg)
      return rejectWithValue(msg)
    }
  }
)
