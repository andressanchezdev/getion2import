// employees.slice · estado de empleados y roles: la lista de empleados (con la bodega por la que se pidió) y la lista de roles
// conecta con: employees.thunks (lo llenan), employees.selectors (lecturas) y rootReducer (clave 'employees'; NO se guarda en el navegador)
// ojo: se vacía al cerrar sesión; al saltar de compañía rootReducer lo reinicia; la lista de empleados descarta respuestas de cargas anteriores (requestId)
import { applyVersionedStatus, mergeVersionedList } from '@/global/helpers/realtime/applyVersioned'
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { logoutThunk } from '@/features/auth'
import { INITIAL_EMPLOYEES_STATE } from '../constants/employees.constants'
import { loadEmployeesThunk, loadRolesThunk, setEmployeeStatusThunk } from '../thunks/employees.thunks'

export const employeesSlice = createSlice({
  name: 'employees',
  initialState: INITIAL_EMPLOYEES_STATE,
  reducers: {
    // tiempo real (entity.status_changed de empleado): cambia el estado de la fila si ya está cargada
    employeeStatusFromEvent: (state, action: PayloadAction<{ id: number; isActive: boolean; version?: string }>) => {
      const row = state.directory.items.find((employee) => employee.employeeId === action.payload.id)
      if (row) applyVersionedStatus(row, action.payload.isActive, action.payload.version)
    },
    // tiempo real (entity.status_changed de rol)
    roleStatusFromEvent: (state, action: PayloadAction<{ id: number; isActive: boolean; version?: string }>) => {
      const row = state.roles.items.find((role) => role.roleId === action.payload.id)
      if (row) applyVersionedStatus(row, action.payload.isActive, action.payload.version)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadEmployeesThunk.pending, (state, action) => {
        state.directory.status = 'loading'
        state.directory.error = null
        state.directory.requestId = action.meta.requestId
        state.directory.warehouseId = action.meta.arg
      })
      .addCase(loadEmployeesThunk.fulfilled, (state, action) => {
        if (state.directory.requestId !== action.meta.requestId) return
        state.directory.items = mergeVersionedList(state.directory.items, action.payload, (e) => e.employeeId)
        state.directory.status = 'succeeded'
      })
      .addCase(loadEmployeesThunk.rejected, (state, action) => {
        if (state.directory.requestId !== action.meta.requestId) return
        state.directory.items = []
        state.directory.status = 'failed'
        state.directory.error = action.payload ?? 'No se pudieron cargar los empleados.'
      })
      .addCase(loadRolesThunk.pending, (state) => {
        state.roles.status = 'loading'
        state.roles.error = null
      })
      .addCase(loadRolesThunk.fulfilled, (state, action) => {
        state.roles.items = mergeVersionedList(state.roles.items, action.payload, (r) => r.roleId)
        state.roles.status = 'succeeded'
      })
      .addCase(loadRolesThunk.rejected, (state, action) => {
        state.roles.status = 'failed'
        state.roles.error = action.payload ?? 'No se pudieron cargar los roles.'
      })
      .addCase(setEmployeeStatusThunk.fulfilled, (state, action) => {
        const row = state.directory.items.find((employee) => employee.employeeId === action.payload.employeeId)
        if (row) row.isActive = action.payload.isActive
      })
      .addCase(logoutThunk.fulfilled, () => INITIAL_EMPLOYEES_STATE)
  },
})

export const { employeeStatusFromEvent, roleStatusFromEvent } = employeesSlice.actions
export const employeesReducer = employeesSlice.reducer
export default employeesSlice.reducer
