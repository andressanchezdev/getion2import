// employees.manage.thunks.test · registrar un empleado y cambiar su estado contra un service simulado
import { configureStore } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_EMPLOYEES_STATE } from '../constants/employees.constants'
import * as service from '../services/employees.service'
import { employeesReducer } from '../slices/employees.slice'
import { createEmployeeThunk, setEmployeeStatusThunk } from './employees.thunks'
import type { NewEmployeeInput, SimpleEmployee } from '../types/employees.types'

vi.mock('../services/employees.service')
vi.mock('@/global/helpers/feedback/toast', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const employee = { employeeId: 5, isActive: true } as SimpleEmployee
const input: NewEmployeeInput = { firstName: 'Ana', lastName: '', email: 'a@x.co', password: '12345678', documentType: 'CC', warehouseId: 1, roleId: 2, workModality: 'onsite' }
const makeStore = () =>
  configureStore({
    reducer: { employees: employeesReducer, auth: (s = { status: 'authenticated', user: { userId: 1, companyId: 1, userType: 'admin' } }) => s },
    preloadedState: { employees: { ...INITIAL_EMPLOYEES_STATE, directory: { ...INITIAL_EMPLOYEES_STATE.directory, items: [employee] } } },
  } as never)

describe('employees thunks de gestión', () => {
  beforeEach(() => vi.resetAllMocks())

  it('desactivar actualiza la fila sin mutar el original', async () => {
    vi.mocked(service.setEmployeeStatus).mockResolvedValue()
    const store = makeStore()
    await store.dispatch(setEmployeeStatusThunk({ employeeId: 5, isActive: false }) as never)
    expect(service.setEmployeeStatus).toHaveBeenCalledWith(5, 'inactive')
    expect((store.getState() as { employees: { directory: { items: SimpleEmployee[] } } }).employees.directory.items[0].isActive).toBe(false)
    expect(employee.isActive).toBe(true)
  })

  it('si el backend rechaza el cambio, la fila no cambia', async () => {
    vi.mocked(service.setEmployeeStatus).mockRejectedValue(new Error('403'))
    const store = makeStore()
    await store.dispatch(setEmployeeStatusThunk({ employeeId: 5, isActive: false }) as never)
    expect((store.getState() as { employees: { directory: { items: SimpleEmployee[] } } }).employees.directory.items[0].isActive).toBe(true)
  })

  it('registrar llama al service con los datos', async () => {
    vi.mocked(service.createEmployee).mockResolvedValue()
    vi.mocked(service.fetchEmployeesList).mockResolvedValue([])
    const store = makeStore()
    await store.dispatch(createEmployeeThunk(input) as never)
    expect(service.createEmployee).toHaveBeenCalledWith(input)
  })
})
