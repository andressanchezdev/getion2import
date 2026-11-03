// employees.constants · estado inicial de empleados y roles
// conecta con: employees.slice (initialState)
import type { EmployeesState } from '../types/employees.types'

export const INITIAL_EMPLOYEES_STATE: EmployeesState = {
  directory: { items: [], status: 'idle', error: null, requestId: null, warehouseId: undefined },
  roles: { items: [], status: 'idle', error: null },
}
