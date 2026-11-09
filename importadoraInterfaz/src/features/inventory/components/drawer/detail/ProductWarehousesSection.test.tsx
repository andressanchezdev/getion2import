// ProductWarehousesSection.test · el detalle del producto muestra TODAS las ubicaciones donde está guardado dentro de cada bodega
// conecta con: ProductWarehousesSection; los datos son de ejemplo (no hay red); se corre con npm test
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Product } from '@/features/shop'
import type { StockFullDto } from '../../../types/inventory.api.types'
import { ProductWarehousesSection } from './ProductWarehousesSection'

const product = { id: '1', code: 'REP-1', name: 'Pastillas', prices: { p0: 0, p1: 0, p2: 0, p3: 0 }, stockByWarehouse: {} } as Product
const warehouses = [
  { id: 1, name: 'Principal' },
  { id: 2, name: 'Norte' },
]
const row = (stockId: number, warehouseId: number, location: string, available: number) => ({ stockId, warehouseId, location, available, reserved: 0, sellable: available }) as StockFullDto

afterEach(cleanup)

describe('ProductWarehousesSection', () => {
  it('con varias ubicaciones en una bodega las lista todas con sus unidades, la de más unidades primero', () => {
    const rows = [row(1, 1, 'ESTANTE-A', 4), row(2, 1, 'ESTANTE-B', 9), row(3, 1, 'ESTANTE-C', 1)]
    render(<ProductWarehousesSection product={product} warehouses={warehouses} stockRows={rows} loading={false} />)
    expect(screen.getByText('3 ubicaciones')).toBeTruthy()
    const items = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(items).toEqual(['ESTANTE-B9 uds', 'ESTANTE-A4 uds', 'ESTANTE-C1 uds'])
  })

  it('con una sola ubicación muestra su código sin lista', () => {
    render(<ProductWarehousesSection product={product} warehouses={warehouses} stockRows={[row(1, 1, 'ESTANTE-A', 4)]} loading={false} />)
    expect(screen.getByText('ESTANTE-A')).toBeTruthy()
    expect(screen.queryByRole('listitem')).toBeNull()
  })

  it('una bodega sin existencias del producto dice que no tiene estante asignado', () => {
    render(<ProductWarehousesSection product={product} warehouses={warehouses} stockRows={[row(1, 1, 'ESTANTE-A', 4)]} loading={false} />)
    expect(screen.getByText('Sin estante asignado')).toBeTruthy()
  })

  it('mientras carga avisa que está consultando', () => {
    render(<ProductWarehousesSection product={product} warehouses={warehouses} stockRows={[]} loading />)
    expect(screen.getByText(/Cargando existencias/)).toBeTruthy()
  })
})
