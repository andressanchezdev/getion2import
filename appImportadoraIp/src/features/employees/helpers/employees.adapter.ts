// employees.adapter · convierte lo que responde el backend en empleados y roles a lo que usa la app
// conecta con: employees.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend en empleados
// ojo: un empleado puede tener varias sedes y varios roles (o ninguno: llegan null); aquí se unen en un texto y se guardan los ids de sus sedes para filtrar
import type { EmployeeDto, RoleAreaDto } from '../types/employees.api.types'
import type { EmployeeRole, SimpleEmployee } from '../types/employees.types'

export const toEmployee = (dto: EmployeeDto): SimpleEmployee => {
  const branches = dto.branches ?? []
  const roles = dto.roles ?? []
  return {
    employeeId: dto.employeeId,
    name: dto.name ?? '',
    lastName: dto.lastName,
    email: dto.email ?? '',
    identification: dto.identification ?? '',
    workModality: dto.workModality || undefined,
    primaryWarehouseId: branches[0]?.branchId,
    warehouseIds: branches.map((branch) => branch.branchId),
    warehouseName: branches.map((branch) => branch.branchName).filter(Boolean).join(', ') || undefined,
    roleName: roles.map((role) => role.roleName).filter(Boolean).join(', ') || undefined,
    phone: dto.phone || undefined,
    employmentStatus: dto.employmentStatus,
    isActive: dto.isActive !== false,
  }
}

// aplana las áreas en una lista de roles (cada uno recuerda su área); las áreas sin roles no aportan filas
export const toRoles = (areas: RoleAreaDto[]): EmployeeRole[] =>
  areas.flatMap((area) =>
    (area.roles ?? []).map((role) => ({
      roleId: role.roleId,
      roleName: role.roleName ?? '',
      description: role.description,
      areaName: area.areaName,
    }))
  )
