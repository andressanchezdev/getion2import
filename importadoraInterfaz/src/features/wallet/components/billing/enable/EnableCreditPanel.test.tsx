// EnableCreditPanel.test · pruebas del panel de habilitar crédito: con cliente ya elegido (desde la tabla de clientes) no hay buscador y trae su cupo y plazo; sin cliente muestra el buscador
// conecta con: EnableCreditPanel; la búsqueda de clientes y el guardado están simulados (no hay red); se corre con npm test
import { configureStore } from '@reduxjs/toolkit'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EnableCreditPanel } from './EnableCreditPanel'
import type { CreditCustomerOption } from '../../../types/wallet.types'

const found = vi.hoisted(() => ({ items: [] as CreditCustomerOption[], lastQuery: '' }))
vi.mock('../../../hooks/useCreditCustomerSearch', () => ({
  useCreditCustomerSearch: (query: string) => {
    found.lastQuery = query
    return { items: found.items, status: 'succeeded' }
  },
}))
vi.mock('@/global/helpers/feedback/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const store = () => configureStore({ reducer: { ui: (state = {}) => state } })
const renderPanel = (props: React.ComponentProps<typeof EnableCreditPanel> = {}) =>
  render(
    <Provider store={store()}>
      <EnableCreditPanel {...props} />
    </Provider>
  )

afterEach(() => {
  cleanup()
  found.items = []
  found.lastQuery = ''
})

const customer = { id: 8, name: 'Motos SAS', identification: '901442119' }

describe('EnableCreditPanel', () => {
  it('con cliente elegido no muestra el buscador y busca por su documento', () => {
    renderPanel({ customer })
    expect(screen.queryByPlaceholderText(/NIT, cédula o nombre/i)).toBeNull()
    expect(found.lastQuery).toBe('901442119')
    expect(screen.getByText('Motos SAS')).toBeTruthy()
    expect(screen.getByText('Doc: 901442119')).toBeTruthy()
  })

  it('un cliente sin crédito arranca con el cupo y el plazo de partida', () => {
    renderPanel({ customer })
    expect((screen.getByLabelText(/Cupo de Crédito/i) as HTMLInputElement).value).toBe('1.000.000')
    expect((screen.getByLabelText(/Días de Plazo/i) as HTMLInputElement).value).toBe('30')
  })

  it('si el cliente ya tiene crédito, trae su cupo y plazo actuales', () => {
    found.items = [{ id: 8, name: 'Motos SAS', identification: '901442119', creditLimit: 2500000, creditDays: 45, isCredit: true }]
    renderPanel({ customer })
    expect((screen.getByLabelText(/Cupo de Crédito/i) as HTMLInputElement).value).toBe('2.500.000')
    expect((screen.getByLabelText(/Días de Plazo/i) as HTMLInputElement).value).toBe('45')
  })

  it('lo que el usuario escribe manda sobre lo que trae el cliente', () => {
    found.items = [{ id: 8, name: 'Motos SAS', identification: '901442119', creditLimit: 2500000, creditDays: 45, isCredit: true }]
    renderPanel({ customer })
    fireEvent.change(screen.getByLabelText(/Días de Plazo/i), { target: { value: '60' } })
    expect((screen.getByLabelText(/Días de Plazo/i) as HTMLInputElement).value).toBe('60')
    expect((screen.getByLabelText(/Cupo de Crédito/i) as HTMLInputElement).value).toBe('2.500.000')
  })

  it('sin cliente elegido muestra el buscador y no hay formulario hasta elegir uno', () => {
    renderPanel()
    expect(screen.getByPlaceholderText(/NIT, cédula o nombre/i)).toBeTruthy()
    expect(screen.queryByLabelText(/Cupo de Crédito/i)).toBeNull()
  })

  it('al elegir un cliente de la lista aparece el formulario con su crédito actual', () => {
    found.items = [{ id: 3, name: 'Taller Sport', identification: '1094827110', creditLimit: 800000, creditDays: 15, isCredit: true }]
    renderPanel()
    fireEvent.click(screen.getByText('Taller Sport'))
    expect((screen.getByLabelText(/Cupo de Crédito/i) as HTMLInputElement).value).toBe('800.000')
    expect((screen.getByLabelText(/Días de Plazo/i) as HTMLInputElement).value).toBe('15')
  })
})
