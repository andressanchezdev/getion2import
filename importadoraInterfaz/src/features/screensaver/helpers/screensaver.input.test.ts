import { afterEach, describe, expect, it } from 'vitest'
import { trackScreensaverInput, type ScreensaverInput } from './screensaver.input'

let input: ScreensaverInput | null = null
const canvas = () => Object.assign(document.createElement('canvas'), { width: innerWidth, height: innerHeight })
const fire = (type: string, x = 0, y = 0) => window.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }))

afterEach(() => {
  input?.dispose()
  input = null
})

describe('trackScreensaverInput', () => {
  it('moviendo el cursor sin apretar guarda su posición y no gira la imagen', () => {
    input = trackScreensaverInput(canvas())
    fire('mousemove', 100, 50)
    expect(input.pointer).toMatchObject({ x: 100, y: 50 })
    expect(input.view).toEqual({ yaw: 0, pitch: 0 })
  })

  it('con el clic sostenido gira la imagen y el cursor deja de remover la arena', () => {
    input = trackScreensaverInput(canvas())
    fire('mousemove', 10, 10)
    fire('mousedown', 10, 10)
    fire('mousemove', 110, 60)
    expect(input.pointer).toBeNull()
    expect(input.view.yaw).toBeGreaterThan(0)
    expect(input.view.pitch).toBeGreaterThan(0)
  })

  it('al soltar el clic ya no gira más', () => {
    input = trackScreensaverInput(canvas())
    fire('mousedown', 0, 0)
    fire('mousemove', 50, 0)
    fire('mouseup')
    const yaw = input.view.yaw
    fire('mousemove', 300, 0)
    expect(input.view.yaw).toBe(yaw)
  })

  it('la velocidad del cursor se apaga sola con el tiempo', () => {
    input = trackScreensaverInput(canvas())
    fire('mousemove', 0, 0)
    fire('mousemove', 200, 0)
    const before = Math.abs(input.pointer?.vx ?? 0)
    input.fade(1)
    expect(Math.abs(input.pointer?.vx ?? 0)).toBeLessThan(before)
  })

  it('al terminar deja de escuchar', () => {
    input = trackScreensaverInput(canvas())
    input.dispose()
    fire('mousemove', 5, 5)
    expect(input.pointer).toBeNull()
  })
})
