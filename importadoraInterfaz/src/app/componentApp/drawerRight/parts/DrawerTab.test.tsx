// DrawerTab.test · pruebas de la pestaña del carrito: un clic lo abre, un arrastre vertical lo mueve sin abrirlo y las flechas también lo mueven
// conecta con: DrawerTab y global useVerticalDrag (clampTop); se corre con npm test
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { clampTop } from '@/global/hooks/useVerticalDrag'
import { DrawerTab } from './DrawerTab'

describe('clampTop', () => {
  it('deja la posición dentro de la pantalla', () => {
    expect(clampTop(300, 60, 800)).toBe(300)
    expect(clampTop(-50, 60, 800)).toBe(8)
    expect(clampTop(900, 60, 800)).toBe(732)
  })
})

describe('DrawerTab', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(cleanup)

  const setup = () => {
    const onOpen = vi.fn()
    render(<DrawerTab icon="icon.svg" count={3} onOpen={onOpen} />)
    return { onOpen, tab: screen.getByRole('button') }
  }
  const topOf = (tab: HTMLElement) => Number.parseFloat(tab.style.top)

  it('un clic sin arrastre abre el carrito', () => {
    const { onOpen, tab } = setup()
    fireEvent.click(tab)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('arrastrar en vertical lo mueve, lo guarda y no abre el carrito', () => {
    const { onOpen, tab } = setup()
    const start = topOf(tab)
    fireEvent.pointerDown(tab, { pointerId: 1, clientY: 300 })
    fireEvent.pointerMove(tab, { pointerId: 1, clientY: 360 })
    fireEvent.pointerUp(tab, { pointerId: 1, clientY: 360 })
    fireEvent.click(tab) // el clic que llega tras soltar se descarta
    expect(topOf(tab)).toBe(start + 60)
    expect(onOpen).not.toHaveBeenCalled()
    expect(window.localStorage.getItem('ip_cart_tab_top')).toBe(String(start + 60))
    fireEvent.click(tab) // el siguiente clic ya es normal
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('un movimiento muy corto cuenta como clic', () => {
    const { onOpen, tab } = setup()
    fireEvent.pointerDown(tab, { pointerId: 1, clientY: 300 })
    fireEvent.pointerMove(tab, { pointerId: 1, clientY: 302 })
    fireEvent.pointerUp(tab, { pointerId: 1, clientY: 302 })
    fireEvent.click(tab)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('las flechas arriba y abajo lo mueven', () => {
    const { tab } = setup()
    const start = topOf(tab)
    fireEvent.keyDown(tab, { key: 'ArrowDown' })
    expect(topOf(tab)).toBe(start + 24)
    fireEvent.keyDown(tab, { key: 'ArrowUp' })
    fireEvent.keyDown(tab, { key: 'ArrowUp' })
    expect(topOf(tab)).toBe(start - 24)
  })

  it('recuerda la posición guardada', () => {
    window.localStorage.setItem('ip_cart_tab_top', '200')
    const { tab } = setup()
    expect(topOf(tab)).toBe(200)
  })
})
