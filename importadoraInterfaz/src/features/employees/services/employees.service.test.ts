// employees.service.test · pruebas de las llamadas de empleados, roles, credenciales y permisos
// conecta con: employees.service y apiClient; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { fetchEmployeePermissions, fetchEmployeeRoles, fetchEmployeesList, saveEmployeePermissions, updateAccessCredentials } from './employees.service'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { get: vi.fn(), put: vi.fn() },
}))

const meta = { currentPage: 1, pageSize: 50, totalRecords: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('employees.service', () => {
  it('fetchEmployeesList: GET /employees con compañía, página y tamaño; convierte los empleados', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [{ id: 10, firstName: 'Carlos', lastName: 'López', email: 'c@x.co', document: '987' }], meta } })
    const list = await fetchEmployeesList(1)
    expect(apiClient.get).toHaveBeenCalledWith('/employees', { params: { companyId: 1, page: 1, pageSize: 50 } })
    expect(list[0]).toMatchObject({ employeeId: 10, name: 'Carlos', identification: '987' })
  })

  it('con bodega pide solo los de esa bodega', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [], meta } })
    await fetchEmployeesList(1, 4)
    expect(apiClient.get).toHaveBeenCalledWith('/employees', { params: { companyId: 1, page: 1, pageSize: 50, warehouseId: 4 } })
  })

  it('fetchEmployeePermissions: GET /employees/:id/permissions y arma la matriz del menú', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [{ id: 3, module: 'orders', action: 'view' }] } })
    const res = await fetchEmployeePermissions(10)
    expect(apiClient.get).toHaveBeenCalledWith('/employees/10/permissions')
    const shop = res.modules?.find((item) => item.moduleKey === 'shop')
    expect(shop?.screens.find((s) => s.screenKey === 'orders')?.canRead).toBe(true)
  })

  it('saveEmployeePermissions: lee el catálogo y lo actual y guarda con PUT { permissionIds }', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) =>
      url === '/permissions'
        ? { data: { success: true, data: [{ id: 3, module: 'orders', action: 'view' }, { id: 4, module: 'orders', action: 'view_detail' }, { id: 9, module: 'orders', action: 'take_picking' }] } }
        : { data: { success: true, data: [{ id: 9, module: 'orders', action: 'take_picking' }] } }
    )
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} })
    const res = await fetchEmployeePermissions(10) // arma una matriz base
    const modules = res.modules!.map((m) =>
      m.moduleKey === 'shop' ? { ...m, screens: m.screens.map((s) => (s.screenKey === 'orders' ? { ...s, canRead: true } : s)) } : m
    )
    await saveEmployeePermissions(10, modules)
    expect(apiClient.put).toHaveBeenCalledWith('/employees/10/permissions', { permissionIds: [3, 4, 9] })
  })

  it('fetchEmployeeRoles: GET /roles y convierte id y nombre', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [{ id: 2, name: 'Vendedor', description: 'Ventas' }] } })
    expect(await fetchEmployeeRoles()).toEqual([{ roleId: 2, roleName: 'Vendedor', description: 'Ventas' }])
    expect(apiClient.get).toHaveBeenCalledWith('/roles', { params: { activeOnly: true } })
  })

  it('updateAccessCredentials: PUT /employees/:id/credentials solo con la contraseña nueva', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} })
    await updateAccessCredentials({ employeeId: 10, email: 'c@x.co', password: 'ClaveNueva#1', currentPassword: 'vieja' })
    expect(apiClient.put).toHaveBeenCalledWith('/employees/10/credentials', { password: 'ClaveNueva#1' })
  })
})
