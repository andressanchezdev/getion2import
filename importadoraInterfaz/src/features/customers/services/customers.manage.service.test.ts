// customers.manage.service.test · pruebas de editar (PUT /customers/:id) y eliminar (DELETE /customers/:id) un cliente
// conecta con: customers.service y customers.thunks (deleteCustomerThunk); el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { apiClient } from '@/api'
import { deleteCustomer, updateCustomer } from './customers.service'
import { deleteCustomerThunk } from '../thunks/customers.thunks'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

beforeEach(() => vi.clearAllMocks())

describe('updateCustomer y deleteCustomer', () => {
  it('updateCustomer: PUT /customers/:id solo con lo que se cambia', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: { success: true } })
    await updateCustomer(7, { name: 'Taller Nuevo', phone: '3001234567' })
    expect(apiClient.put).toHaveBeenCalledWith('/customers/7', { name: 'Taller Nuevo', phone: '3001234567' })
  })

  it('deleteCustomer: DELETE /customers/:id con motivo', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { success: true } })
    await deleteCustomer(7, 'Solicitud del titular')
    expect(apiClient.delete).toHaveBeenCalledWith('/customers/7', { data: { reason: 'Solicitud del titular' } })
  })
})

describe('deleteCustomerThunk', () => {
  const store = () => configureStore({ reducer: (state: object = {}) => state })

  it('devuelve el id del cliente eliminado', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { success: true } })
    const result = await store().dispatch(deleteCustomerThunk({ customerId: 7, reason: 'Solicitud del titular' }))
    expect(result.type).toBe('customers/delete/fulfilled')
    expect(result.payload).toBe(7)
  })

  it('si la API falla devuelve el mensaje para el usuario', async () => {
    vi.mocked(apiClient.delete).mockRejectedValue({ userFriendlyMessage: 'No tienes permiso para eliminar este cliente.' })
    const result = await store().dispatch(deleteCustomerThunk({ customerId: 7, reason: 'Solicitud del titular' }))
    expect(result.type).toBe('customers/delete/rejected')
    expect(result.payload).toBe('No tienes permiso para eliminar este cliente.')
  })
})
