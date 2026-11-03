// ProductCardActions.test · pruebas de la fila de acciones de la carta: el ícono de bajo stock va junto al contador y el agotado solo cambia el botón
// conecta con: ProductCardActions (y ProductCardStock por dentro); se corre con npm test
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProductCardActions } from './ProductCardActions'

afterEach(cleanup)

const base = { quantityText: '1', maxQuantity: 4, isOutOfStock: false, cartQuantity: 0, onQuantityChange: vi.fn(), onQuantityBlur: vi.fn(), onAdd: vi.fn() }

describe('ProductCardActions', () => {
  it('con bajo stock muestra el ícono de advertencia pegado al contador de cantidad', () => {
    render(<ProductCardActions {...base} lowStockQuantity={4} />)
    const icon = screen.getByRole('img', { name: 'Bajo stock: quedan 4 unidades' })
    const counter = screen.getByLabelText('Cantidad a ordenar (máximo 4)')
    expect(icon.parentElement).toBe(counter.parentElement)
    expect(icon.parentElement?.className).toBe('product-card-qty-group')
  })

  it('sin bajo stock no hay ícono', () => {
    render(<ProductCardActions {...base} />)
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('agotado: el botón dice «Agotado», queda inactivo y no hay ningún aviso aparte', () => {
    render(<ProductCardActions {...base} maxQuantity={0} isOutOfStock />)
    const button = screen.getByRole('button', { name: 'Agotado' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.queryByText(/en esta bodega/i)).toBeNull()
  })
})
