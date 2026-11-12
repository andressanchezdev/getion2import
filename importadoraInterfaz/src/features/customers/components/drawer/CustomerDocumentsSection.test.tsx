// CustomerDocumentsSection.test · pruebas del bloque de documentos del cliente: estados de vigencia, botones de renovar solo en vencidos o por vencer y renovación con y sin archivo
// conecta con: CustomerDocumentsSection; el hook de documentos está simulado (no hay red); se corre con npm test
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CustomerDocumentsSection } from './CustomerDocumentsSection'
import type { CustomerDocument } from '../../types/customers.types'

const state = vi.hoisted(() => ({ items: [] as CustomerDocument[], status: 'succeeded', error: null as string | null, saving: false, renew: vi.fn() }))
vi.mock('../../hooks/useCustomerDocuments', () => ({ useCustomerDocuments: () => state }))
// el usuario de la prueba puede renovar (customers:edit)
vi.mock('@/global/hooks/access/usePermissions', () => ({ usePermissions: () => ({ can: () => true }) }))

const doc = (over: Partial<CustomerDocument>): CustomerDocument => ({
  id: 1,
  customerId: 9,
  type: 'rut',
  fileName: 'rut.pdf',
  fileUrl: '/uploads/rut.pdf',
  notes: '',
  uploadedAt: '2025-10-01T00:00:00Z',
  expiresAt: '2026-10-01T00:00:00Z',
  status: 'valid',
  daysLeft: 200,
  ...over,
})

afterEach(() => {
  cleanup()
  Object.assign(state, { items: [], status: 'succeeded', error: null, saving: false })
  state.renew.mockClear()
})

describe('CustomerDocumentsSection', () => {
  it('sin documentos avisa que no hay ninguno cargado', () => {
    render(<CustomerDocumentsSection customerId={9} />)
    expect(screen.getByText('Este cliente no tiene documentos cargados.')).toBeTruthy()
  })

  it('muestra el estado de cada documento y solo ofrece renovar los vencidos o por vencer', () => {
    state.items = [doc({ id: 1 }), doc({ id: 2, type: 'id_card', status: 'expiring', daysLeft: 10 }), doc({ id: 3, type: 'chamber', status: 'expired', daysLeft: -5 })]
    render(<CustomerDocumentsSection customerId={9} />)
    expect(screen.getByText('Vigente')).toBeTruthy()
    expect(screen.getByText('Vence en 10 días')).toBeTruthy()
    expect(screen.getByText('Vencido hace 5 días')).toBeTruthy()
    expect(screen.getAllByText('Renovar')).toHaveLength(2)
  })

  it('«Renovar» renueva sin archivo', () => {
    state.items = [doc({ id: 3, status: 'expired', daysLeft: -5 })]
    render(<CustomerDocumentsSection customerId={9} />)
    fireEvent.click(screen.getByText('Renovar'))
    expect(state.renew).toHaveBeenCalledWith(3)
  })

  it('«Renovar con archivo» renueva con el archivo elegido', () => {
    state.items = [doc({ id: 3, status: 'expired', daysLeft: -5 })]
    const { container } = render(<CustomerDocumentsSection customerId={9} />)
    fireEvent.click(screen.getByText('Renovar con archivo'))
    const file = new File(['x'], 'nuevo.pdf', { type: 'application/pdf' })
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [file] } })
    expect(state.renew).toHaveBeenCalledWith(3, file)
  })

  it('mientras se guarda los botones de renovar quedan bloqueados', () => {
    state.items = [doc({ id: 3, status: 'expired', daysLeft: -5 })]
    state.saving = true
    render(<CustomerDocumentsSection customerId={9} />)
    expect((screen.getByText('Renovar') as HTMLButtonElement).disabled).toBe(true)
  })
})
