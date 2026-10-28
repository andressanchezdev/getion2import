// employees.service.test · pruebas unitarias de los endpoints de empleados, roles y permisos
// conecta con: employees.service, apiClient y vitest
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  fetchEmployeesList,
  fetchEmployeePermissions,
  saveEmployeePermissions,
  fetchEmployeeRoles,
  updateAccessCredentials,
} from './employees.service'
import { apiClient } from '@/api'

vi.mock('@/api', async () => {
  const actual = await vi.importActual<any>('@/api')
  return {
    ...actual,
    apiClient: {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
    },
  }
})

describe('employees.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchEmployeesList consulta /employees/list y mapea los empleados', async () => {
    const mockData = {
      data: {
        success: true,
        data: [
          {
            employeeId: 10,
            name: 'Carlos',
            lastName: 'López',
            email: 'carlos@empresa.com',
            identification: '98765432',
          },
        ],
      },
    }
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockData as any)

    const list = await fetchEmployeesList(1)
    expect(apiClient.post).toHaveBeenCalledWith('/employees/list', {
      companyId: 1,
      limit: 50,
      page: 1,
    })
    expect(list).toHaveLength(1)
    expect(list[0].employeeId).toBe(10)
    expect(list[0].name).toBe('Carlos')
  })

  it('fetchEmployeePermissions consulta /employees/permissions', async () => {
    const mockData = {
      data: {
        success: true,
        data: {
          branches: [{ branchId: 1, branchName: 'Central', isPrimary: true }],
          modules: [{ moduleKey: 'shop', canRead: true, canCreate: true, canUpdate: false, canDelete: false, screens: [] }],
        },
      },
    }
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockData as any)

    const res = await fetchEmployeePermissions(10)
    expect(apiClient.post).toHaveBeenCalledWith('/employees/permissions', { employeeId: 10 })
    expect(res.branches).toHaveLength(1)
    expect(res.modules).toHaveLength(1)
  })

  it('saveEmployeePermissions envía /employees/permissions/modules', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true } } as any)

    await saveEmployeePermissions(10, [
      { moduleKey: 'shop', canRead: true, canCreate: true, canUpdate: true, canDelete: false, screens: [] },
    ])
    expect(apiClient.post).toHaveBeenCalledWith('/employees/permissions/modules', {
      employeeId: 10,
      modules: [
        { moduleKey: 'shop', canRead: true, canCreate: true, canUpdate: true, canDelete: false, screens: [] },
      ],
    })
  })

  it('fetchEmployeeRoles consulta GET /employees/roles', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [{ roleId: 1, roleName: 'Vendedor', description: 'Ventas mostrador' }],
      },
    } as any)

    const roles = await fetchEmployeeRoles()
    expect(apiClient.get).toHaveBeenCalledWith('/employees/roles')
    expect(roles).toHaveLength(1)
    expect(roles[0].roleName).toBe('Vendedor')
  })

  it('updateAccessCredentials envía PUT /employees/access-credentials', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { success: true } } as any)

    await updateAccessCredentials({
      employeeId: 10,
      email: 'carlos@empresa.com',
      password: 'newPassword123',
    })
    expect(apiClient.put).toHaveBeenCalledWith('/employees/access-credentials', {
      employeeId: 10,
      email: 'carlos@empresa.com',
      password: 'newPassword123',
    })
  })
})
