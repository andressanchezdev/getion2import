// ProductCardStock.test · pruebas del ícono de advertencia de bajo stock: dice cuánto queda en su nombre accesible y en el tooltip
// conecta con: ProductCardStock; se corre con npm test
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ProductCardStock } from './ProductCardStock'

afterEach(cleanup)

describe('ProductCardStock', () => {
  it('es solo un ícono: el detalle está en el nombre accesible y en el tooltip', () => {
    render(<ProductCardStock stock={3} />)
    const icon = screen.getByRole('img', { name: 'Bajo stock: quedan 3 unidades' })
    expect(icon.getAttribute('title')).toBe('Bajo stock: quedan 3 unidades')
    expect(icon.textContent).toBe('')
  })

  it('con una sola unidad lo dice en singular', () => {
    render(<ProductCardStock stock={1} />)
    expect(screen.getByRole('img', { name: 'Bajo stock: quedan 1 unidad' })).toBeTruthy()
  })

  it('se puede enfocar con el teclado', () => {
    render(<ProductCardStock stock={2} />)
    expect(screen.getByRole('img').getAttribute('tabindex')).toBe('0')
  })
})
