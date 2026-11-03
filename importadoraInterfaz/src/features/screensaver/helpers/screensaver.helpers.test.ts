// screensaver.helpers.test · pruebas de la lógica del protector de pantalla: elegir puntos de la imagen, fases del ciclo y movimiento de la arena
// conecta con: screensaver.sampling y screensaver.physics; se corre con npm test
import { describe, expect, it } from 'vitest'
import { SCREENSAVER_CYCLE } from '../constants/screensaver.constants'
import { createField, getLayout, getPhase, snapToTargets, stepField } from './screensaver.physics'
import { getLuma, packColor, pickTargets } from './screensaver.sampling'

// imagen de 4x2: fondo oscuro con 2 píxeles claros (uno blanco y uno amarillo)
const makeImage = () => {
  const data = new Uint8ClampedArray(4 * 2 * 4)
  for (let i = 0; i < 8; i += 1) data.set([20, 24, 32, 255], i * 4)
  data.set([255, 255, 255, 255], 1 * 4) // columna 1, fila 0
  data.set([250, 181, 27, 255], (4 + 2) * 4) // columna 2, fila 1
  return data
}
const fixedRand = () => 0.5
const limits = { lumaMin: 150, maxPoints: 100 }

describe('pickTargets', () => {
  it('solo toma los píxeles claros y deja el fondo oscuro fuera', () => {
    const targets = pickTargets(makeImage(), 4, 2, fixedRand, limits)
    expect(targets.count).toBe(2)
    // el recuadro de la tinta va de la columna 1 a la 2 y de la fila 0 a la 1: 2 de ancho por 2 de alto
    expect(targets.aspect).toBe(1)
  })

  it('ubica cada punto dentro del recuadro de la tinta, en proporción de 0 a 1', () => {
    const targets = pickTargets(makeImage(), 4, 2, fixedRand, limits)
    expect(targets.nx[0]).toBeCloseTo(0.5 / 2)
    expect(targets.ny[0]).toBeCloseTo(0.5 / 2)
    expect(targets.nx[1]).toBeCloseTo(1.5 / 2)
    expect(targets.ny[1]).toBeCloseTo(1.5 / 2)
  })

  it('conserva el color de la imagen', () => {
    const targets = pickTargets(makeImage(), 4, 2, fixedRand, limits)
    expect(targets.color[0]).toBe(packColor(255, 255, 255))
    expect(targets.color[1]).toBe(packColor(250, 181, 27))
  })

  it('respeta el tope de puntos', () => {
    const data = new Uint8ClampedArray(100 * 100 * 4).fill(255)
    const targets = pickTargets(data, 100, 100, Math.random, { lumaMin: 150, maxPoints: 1000 })
    expect(targets.count).toBeGreaterThan(700)
    expect(targets.count).toBeLessThan(1300)
  })

  it('ignora los píxeles transparentes', () => {
    const data = new Uint8ClampedArray([255, 255, 255, 0])
    expect(pickTargets(data, 1, 1, fixedRand, limits).count).toBe(0)
  })

  it('el brillo del blanco es 255 y el del negro es 0', () => {
    expect(getLuma(255, 255, 255)).toBeCloseTo(255)
    expect(getLuma(0, 0, 0)).toBe(0)
  })
})

describe('getPhase', () => {
  const { GATHER_MS } = SCREENSAVER_CYCLE

  it('empieza juntando la arena', () => {
    expect(getPhase(0)).toEqual({ name: 'gather', progress: 0 })
  })

  it('el avance al juntarse va de 0 a 1', () => {
    expect(getPhase(GATHER_MS / 2).progress).toBeCloseTo(0.5)
  })

  it('después de juntarse se queda quieta en el logo para siempre, sin irse con el viento', () => {
    expect(getPhase(GATHER_MS).name).toBe('hold')
    expect(getPhase(60 * 60 * 1000).name).toBe('hold')
  })
})

describe('getLayout', () => {
  it('centra el logo sin deformarlo', () => {
    const layout = getLayout(1000, 600, 2)
    expect(layout.width / layout.height).toBeCloseTo(2)
    expect(layout.left + layout.width / 2).toBeCloseTo(500)
    expect(layout.top + layout.height / 2).toBeCloseTo(300)
  })

  it('no se sale de la ventana en una pantalla angosta', () => {
    const layout = getLayout(300, 900, 2)
    expect(layout.left).toBeGreaterThanOrEqual(0)
    expect(layout.left + layout.width).toBeLessThanOrEqual(300)
  })
})

describe('stepField', () => {
  const targets = pickTargets(makeImage(), 4, 2, fixedRand, limits)
  const layout = getLayout(800, 400, targets.aspect)

  const distanceToTargets = (field: ReturnType<typeof createField>) => {
    let total = 0
    for (let i = 0; i < field.count; i += 1) {
      total += Math.hypot(field.x[i] - (layout.left + targets.nx[i] * layout.width), field.y[i] - (layout.top + targets.ny[i] * layout.height))
    }
    return total
  }

  it('al juntarse, la arena se acerca al logo', () => {
    const field = createField(targets.count, 800, 400, () => 0.9)
    const before = distanceToTargets(field)
    for (let i = 0; i < 180; i += 1) stepField(field, targets, layout, { name: 'hold', progress: 0.5 }, 1 / 60, i * 16)
    expect(distanceToTargets(field)).toBeLessThan(before * 0.05)
  })

  it('mantenida en su sitio, la arena casi no se mueve', () => {
    const field = createField(targets.count, 800, 400)
    snapToTargets(field, targets, layout)
    for (let i = 0; i < 120; i += 1) stepField(field, targets, layout, { name: 'hold', progress: 0.5 }, 1 / 60, i * 16)
    expect(distanceToTargets(field) / targets.count).toBeLessThan(2)
  })

  it('un cursor quieto no mueve la arena (no deja hueco)', () => {
    const field = createField(targets.count, 800, 400)
    snapToTargets(field, targets, layout)
    const before = { x: field.x[0], y: field.y[0] }
    const still = { x: before.x + 5, y: before.y, vx: 0, vy: 0 }
    for (let i = 0; i < 60; i += 1) stepField(field, targets, layout, { name: 'hold', progress: 1 }, 1 / 60, 0, still)
    expect(Math.hypot(field.x[0] - before.x, field.y[0] - before.y)).toBeLessThan(2)
  })

  it('un cursor en movimiento arrastra la arena cercana en su dirección', () => {
    const field = createField(targets.count, 800, 400)
    snapToTargets(field, targets, layout)
    const moving = { x: field.x[0] - 10, y: field.y[0], vx: 1000, vy: 0 }
    for (let i = 0; i < 6; i += 1) stepField(field, targets, layout, { name: 'hold', progress: 1 }, 1 / 60, 0, moving)
    expect(field.vx[0]).toBeGreaterThan(0)
  })

  it('el cursor en movimiento no afecta a la arena lejana', () => {
    const field = createField(targets.count, 800, 400)
    snapToTargets(field, targets, layout)
    const startX = field.x[0]
    stepField(field, targets, layout, { name: 'hold', progress: 1 }, 1 / 60, 0, { x: startX + 400, y: field.y[0], vx: 2000, vy: 0 })
    expect(Math.abs(field.vx[0])).toBeLessThan(5)
  })

  it('al detenerse el cursor, la arena vuelve a su lugar', () => {
    const field = createField(targets.count, 800, 400)
    snapToTargets(field, targets, layout)
    const moving = { x: field.x[0], y: field.y[0], vx: 2000, vy: 800 }
    for (let i = 0; i < 20; i += 1) stepField(field, targets, layout, { name: 'hold', progress: 1 }, 1 / 60, i * 16, moving)
    expect(distanceToTargets(field)).toBeGreaterThan(5)
    for (let i = 0; i < 240; i += 1) stepField(field, targets, layout, { name: 'hold', progress: 1 }, 1 / 60, i * 16, null)
    expect(distanceToTargets(field) / targets.count).toBeLessThan(2)
  })

  it('un fotograma muy largo (pestaña dormida) no la lanza de golpe', () => {
    const field = createField(targets.count, 800, 400, () => 0.9)
    stepField(field, targets, layout, { name: 'hold', progress: 0.5 }, 30, 0)
    for (let i = 0; i < field.count; i += 1) expect(Number.isFinite(field.x[i])).toBe(true)
  })
})
