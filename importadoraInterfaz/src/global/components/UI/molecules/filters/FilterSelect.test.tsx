// FilterSelect.test · pruebas unitarias de FilterSelect: presencia de opción «Todos», seleccionable por defecto y cambio de valor
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FilterSelect } from './FilterSelect'

afterEach(() => {
  cleanup()
})

describe('FilterSelect', () => {
  it('genera la opción «Todos» como primera opción seleccionable cuando no está en la lista', () => {
    const onChange = vi.fn()
    render(
      <FilterSelect
        label="Bodega"
        allLabel="Todas las bodegas"
        emptyValue="all"
        value="all"
        options={[
          { value: '1', label: 'Bodega Central' },
          { value: '2', label: 'Bodega Norte' },
        ]}
        onChange={onChange}
      />
    )

    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('all')
    const options = select.querySelectorAll('option')
    expect(options).toHaveLength(3)
    expect(options[0].value).toBe('all')
    expect(options[0].textContent).toBe('Todas las bodegas')
    expect(options[0].disabled).toBe(false)
  })

  it('permite cambiar a otra opción y volver a seleccionar «Todos»', () => {
    const onChange = vi.fn()
    render(
      <FilterSelect
        label="Estado"
        value="pending"
        allLabel="Todos los estados"
        emptyValue=""
        options={[
          { value: 'pending', label: 'Pendiente' },
          { value: 'completed', label: 'Completado' },
        ]}
        onChange={onChange}
      />
    )

    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('pending')

    // Volver a elegir Todos
    fireEvent.change(select, { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('no duplica la opción vacía si ya viene incluida en options', () => {
    const onChange = vi.fn()
    render(
      <FilterSelect
        label="Canal"
        emptyValue="all"
        value="all"
        options={[
          { value: 'all', label: 'Todos los canales' },
          { value: 'web', label: 'Web' },
        ]}
        onChange={onChange}
      />
    )

    const select = screen.getByRole('combobox') as HTMLSelectElement
    const options = select.querySelectorAll('option')
    expect(options).toHaveLength(2)
    expect(options[0].textContent).toBe('Todos los canales')
  })
})
