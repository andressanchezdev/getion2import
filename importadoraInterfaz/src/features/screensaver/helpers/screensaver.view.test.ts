// screensaver.view.test · pruebas del giro 3D de la arena (sin giro queda igual, el giro de 360° vuelve al inicio)
// conecta con: screensaver.view; se corre con npm test
import { describe, expect, it } from 'vitest'
import { projectPoint, rotateView } from './screensaver.view'

const FOCAL = 1000

describe('projectPoint', () => {
  it('sin giro el punto queda exactamente donde estaba, tenga la profundidad que tenga', () => {
    expect(projectPoint(120, -80, 60, { yaw: 0, pitch: 0 }, FOCAL)).toEqual([120, -80])
  })

  it('media vuelta horizontal voltea el punto al otro lado', () => {
    const [x, y] = projectPoint(120, -80, 0, { yaw: Math.PI, pitch: 0 }, FOCAL)
    expect(x).toBeCloseTo(-120, 3)
    expect(y).toBeCloseTo(-80, 3)
  })

  it('una vuelta completa en cualquiera de los dos ejes regresa al mismo lugar', () => {
    const [x, y] = projectPoint(120, -80, 40, { yaw: Math.PI * 2, pitch: Math.PI * 2 }, FOCAL)
    expect(x).toBeCloseTo(120, 3)
    expect(y).toBeCloseTo(-80, 3)
  })

  it('un cuarto de vuelta horizontal deja el logo de canto: lo ancho se vuelve profundidad', () => {
    const [x] = projectPoint(200, 0, 0, { yaw: Math.PI / 2, pitch: 0 }, FOCAL)
    expect(Math.abs(x)).toBeLessThan(1)
  })
})

describe('rotateView', () => {
  it('suma lo arrastrado al giro actual según la velocidad', () => {
    const view = rotateView({ yaw: 0.1, pitch: 0 }, 100, -50, 0.01)
    expect(view.yaw).toBeCloseTo(1.1, 6)
    expect(view.pitch).toBeCloseTo(-0.5, 6)
  })
})
