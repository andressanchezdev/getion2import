// IdleScreensaver.test · pruebas de la pantalla completa: aparece tras el tiempo de espera y solo se cierra al soltar el clic; ni el teclado, ni mover el mouse, ni mantener el clic apretado la cierran
// conecta con: IdleScreensaver (y useIdle por dentro); usa un reloj falso; se corre con npm test
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SCREENSAVER_LABELS, SCREENSAVER_TIMING } from '../constants/screensaver.constants'
import { IdleScreensaver } from './IdleScreensaver'

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms))
const fire = (event: Event) => act(() => void window.dispatchEvent(event))
const isShown = () => screen.queryByLabelText(SCREENSAVER_LABELS.region) !== null

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const sleep = () => {
  render(<IdleScreensaver />)
  advance(SCREENSAVER_TIMING.IDLE_MS + SCREENSAVER_TIMING.CHECK_MS)
  advance(SCREENSAVER_TIMING.WAKE_GRACE_MS)
}

describe('IdleScreensaver', () => {
  it('no se ve mientras hay actividad', () => {
    render(<IdleScreensaver />)
    advance(SCREENSAVER_TIMING.IDLE_MS - 2000)
    expect(isShown()).toBe(false)
  })

  it('aparece al cumplirse el tiempo sin actividad', () => {
    sleep()
    expect(isShown()).toBe(true)
  })

  it('moviendo el mouse muchas veces sigue visible', () => {
    sleep()
    for (let i = 0; i < 50; i += 1) {
      fire(new MouseEvent('mousemove', { clientX: i * 20, clientY: i * 10, bubbles: true }))
      advance(100)
    }
    expect(isShown()).toBe(true)
  })

  it('con el mouse moviéndose durante mucho rato sigue visible', () => {
    sleep()
    for (let i = 0; i < 40; i += 1) {
      fire(new MouseEvent('mousemove', { clientX: i, clientY: i, bubbles: true }))
      advance(SCREENSAVER_TIMING.IDLE_MS / 4)
    }
    expect(isShown()).toBe(true)
  })

  it('mantener el clic apretado no la cierra (sirve para girar la imagen)', () => {
    sleep()
    fire(new MouseEvent('mousedown', { bubbles: true }))
    fire(new MouseEvent('mousemove', { clientX: 300, clientY: 200, bubbles: true }))
    advance(3000)
    expect(isShown()).toBe(true)
  })

  it('al soltar el clic se cierra', () => {
    sleep()
    fire(new MouseEvent('mousedown', { bubbles: true }))
    fire(new MouseEvent('mouseup', { bubbles: true }))
    expect(isShown()).toBe(false)
  })

  it('soltar el dedo también la cierra', () => {
    sleep()
    fire(new Event('touchend', { bubbles: true }))
    expect(isShown()).toBe(false)
  })

  it('una tecla no la cierra y no llega a la pantalla de abajo', () => {
    sleep()
    const key = new KeyboardEvent('keydown', { key: 'a', cancelable: true })
    fire(key)
    expect(isShown()).toBe(true)
    expect(key.defaultPrevented).toBe(true)
  })

  it('el clic que sigue a soltar se traga y no activa lo que queda debajo', () => {
    const underneath = vi.fn()
    document.addEventListener('click', underneath)
    sleep()
    fire(new MouseEvent('mouseup', { bubbles: true }))
    fire(new MouseEvent('click', { bubbles: true, cancelable: true }))
    document.removeEventListener('click', underneath)
    expect(underneath).not.toHaveBeenCalled()
  })
})
