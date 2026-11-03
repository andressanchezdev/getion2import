// ProductCardTierMenu.test · pruebas del menú de tarifas de la carta: abre aunque el producto tenga una sola tarifa y solo deja elegir las que tienen precio
// conecta con: ProductCardTierMenu; simula usePermissions para no montar el store; se corre con npm test
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '../../../types/shop.types'
import { ProductCardTierMenu } from './ProductCardTierMenu'

const canSell = vi.hoisted(() => ({ value: true }))
vi.mock('@/global/hooks/access/usePermissions', () => ({
  usePermissions: () => ({ canPerformAction: () => canSell.value }),
}))

const product = (prices: Partial<Product['prices']>): Product => ({
  id: '1',
  code: 'REP-1',
  name: 'Producto',
  brand: 'Marca',
  category: 'Categoría',
  prices: { p0: 0, p1: 0, p2: 0, p3: 0, ...prices },
  stockByWarehouse: {},
})

afterEach(() => {
  cleanup()
  canSell.value = true
})

describe('ProductCardTierMenu', () => {
  it('abre la lista aunque el producto tenga una sola tarifa', () => {
    render(<ProductCardTierMenu product={product({ p0: 10000 })} level="P0" onLevelChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /cambiar tarifa/i }))
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(4)
  })

  it('las tarifas sin precio se ven como "Sin precio" y no se pueden elegir', () => {
    const onLevelChange = vi.fn()
    render(<ProductCardTierMenu product={product({ p0: 10000 })} level="P0" onLevelChange={onLevelChange} />)
    fireEvent.click(screen.getByRole('button', { name: /cambiar tarifa/i }))
    expect(screen.getAllByText('Sin precio')).toHaveLength(3)
    const options = screen.getAllByRole('menuitemradio')
    expect((options[1] as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(options[1])
    expect(onLevelChange).not.toHaveBeenCalled()
  })

  it('elige una tarifa con precio y cierra el menú', () => {
    const onLevelChange = vi.fn()
    render(<ProductCardTierMenu product={product({ p0: 10000, p1: 9000 })} level="P0" onLevelChange={onLevelChange} />)
    fireEvent.click(screen.getByRole('button', { name: /cambiar tarifa/i }))
    fireEvent.click(screen.getAllByRole('menuitemradio')[1])
    expect(onLevelChange).toHaveBeenCalledWith('P1')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('sin permiso de ventas el icono no abre la lista', () => {
    canSell.value = false
    render(<ProductCardTierMenu product={product({ p0: 10000, p1: 9000 })} level="P0" onLevelChange={vi.fn()} />)
    const trigger = screen.getByRole('button', { name: /cambiar tarifa/i })
    expect((trigger as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(trigger)
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
