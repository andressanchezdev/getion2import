// employees.service.test · pruebas de los endpoints de empleados, roles y permisos con las formas reales del backend
// conecta con: employees.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { fetchEmployeePermissions, fetchEmployeeRoles, fetchEmployeesList, saveEmployeePermissions, updateAccessCredentials } from './employees.service'

vi.mock('@/api', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/api')
  return { ...actual, apiClient: { post: vi.fn(), get: vi.fn(), put: vi.fn() } }
})

beforeEach(() => vi.clearAllMocks())

describe('fetchEmployeesList', () => {
  it('usa POST /employees y arma roles y sedes de cada empleado', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            employeeId: 1,
            userId: 948,
            name: 'Carlos',
            lastName: 'López',
            email: 'c@x.co',
            identification: '98',
            workModality: 'Presencial',
            employmentStatus: 'activo',
            isActive: true,
            branches: [{ branchId: 1, branchName: 'Principal' }, { branchId: 6, branchName: 'Tienda Online' }],
            roles: [{ roleId: 1, roleName: 'Vendedor interno' }, { roleId: 4, roleName: 'Bodeguero' }],
          },
        ],
      },
    })
    const list = await fetchEmployeesList(1)
    expect(apiClient.post).toHaveBeenCalledWith('/employees', { companyId: 1 })
    expect(list[0]).toMatchObject({
      employeeId: 1,
      roleName: 'Vendedor interno, Bodeguero',
      warehouseName: 'Principal, Tienda Online',
      warehouseIds: [1, 6],
      primaryWarehouseId: 1,
      isActive: true,
    })
  })

  it('un empleado sin roles ni sedes (llegan null) no rompe la lista', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: [{ employeeId: 2, branches: null, roles: null }] } })
    const [employee] = await fetchEmployeesList(1)
    expect(employee).toMatchObject({ roleName: undefined, warehouseName: undefined, warehouseIds: [] })
  })

  it('manda warehouseId solo si se elige una sede', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: [] } })
    await fetchEmployeesList(1, 4)
    expect(apiClient.post).toHaveBeenCalledWith('/employees', { companyId: 1, warehouseId: 4 })
  })
})

describe('fetchEmployeeRoles', () => {
  it('pide con companyId en la query y aplana las áreas (las que no tienen roles no aportan filas)', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          { areaId: 3, areaName: 'Administración', roles: [{ roleId: 3, roleName: 'Administrador', description: 'Administra', usersCount: 6 }] },
          { areaId: 4, areaName: 'Logística', roles: null },
        ],
      },
    })
    const roles = await fetchEmployeeRoles(1)
    expect(apiClient.get).toHaveBeenCalledWith('/employees/roles', { params: { companyId: 1 } })
    expect(roles).toEqual([{ roleId: 3, roleName: 'Administrador', description: 'Administra', areaName: 'Administración' }])
  })
})

describe('permisos y credenciales', () => {
  it('fetchEmployeePermissions deja modules vacío cuando el backend no lo trae', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: { employeeId: 10, branches: [{ branchId: 1, branchName: 'Central', isPrimary: true }], modules: [] } } })
    const res = await fetchEmployeePermissions(10)
    expect(apiClient.post).toHaveBeenCalledWith('/employees/permissions', { employeeId: 10 })
    expect(res.branches).toHaveLength(1)
    expect(res.modules).toEqual([])
  })

  it('saveEmployeePermissions envía el empleado y sus módulos', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true } })
    const modules = [{ moduleKey: 'shop', canRead: true, canCreate: false, canUpdate: false, canDelete: false, screens: [] }]
    await saveEmployeePermissions(10, modules)
    expect(apiClient.post).toHaveBeenCalledWith('/employees/permissions/modules', { employeeId: 10, modules })
  })

  it('updateAccessCredentials recorta el correo y manda la contraseña actual solo si existe', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: { success: true } })
    await updateAccessCredentials({ employeeId: 3, email: ' a@b.co ', password: 'x' })
    expect(apiClient.put).toHaveBeenLastCalledWith('/employees/access-credentials', { employeeId: 3, email: 'a@b.co', password: 'x' })
    await updateAccessCredentials({ employeeId: 3, email: 'a@b.co', password: 'x', currentPassword: 'y' })
    expect(apiClient.put).toHaveBeenLastCalledWith('/employees/access-credentials', { employeeId: 3, email: 'a@b.co', password: 'x', currentPassword: 'y' })
  })
})
