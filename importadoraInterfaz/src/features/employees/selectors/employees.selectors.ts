// employees.selectors · lecturas del estado de empleados y roles
// conecta con: employees.slice (estado), useEmployeesDirectory y useRoles
import type { EmployeesState } from '../types/employees.types'

type EmployeesRootState = { employees: EmployeesState }

export const selectEmployeesDirectory = (state: EmployeesRootState) => state.employees.directory
// lee los roles de empleados cargados
export const selectRoles = (state: EmployeesRootState) => state.employees.roles
