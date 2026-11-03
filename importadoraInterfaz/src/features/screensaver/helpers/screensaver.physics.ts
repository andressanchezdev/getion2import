// screensaver.physics · movimiento de la arena: se reparte por la pantalla, se junta en el logo, tiembla un poco y se aparta del cursor
// conecta con: useParticleAnimation (llama a stepField en cada fotograma), screensaver.constants (fuerzas y tiempos) y screensaver.types
// ojo: el cursor remueve la arena solo mientras se mueve; todo es matemática pura (sin canvas ni DOM) para poder probarla; el temblor sale de un seno por punto, así que dos corridas dan lo mismo
import { SCREENSAVER_CYCLE, SCREENSAVER_PHYSICS, SCREENSAVER_POINTER, SCREENSAVER_RENDER } from '../constants/screensaver.constants'
import type { ScreensaverField, ScreensaverLayout, ScreensaverPhase, ScreensaverPointer, ScreensaverTargets } from '../types/screensaver.types'

// en qué fase va, según los milisegundos desde que apareció el protector: primero se junta y después se queda quieta en el logo
export const getPhase = (elapsedMs: number): ScreensaverPhase => {
  const { GATHER_MS } = SCREENSAVER_CYCLE
  return elapsedMs < GATHER_MS ? { name: 'gather', progress: Math.max(0, elapsedMs) / GATHER_MS } : { name: 'hold', progress: 1 }
}

// dónde y de qué tamaño cabe el logo en el lienzo, centrado y sin deformarse
export const getLayout = (canvasWidth: number, canvasHeight: number, aspect: number): ScreensaverLayout => {
  const width = Math.min(canvasWidth * SCREENSAVER_RENDER.LOGO_MAX_WIDTH, canvasHeight * SCREENSAVER_RENDER.LOGO_MAX_HEIGHT * aspect)
  const height = width / aspect
  return { left: (canvasWidth - width) / 2, top: (canvasHeight - height) / 2, width, height }
}

// número entre -1 y 1 que cambia con el tiempo y es distinto para cada punto
const wobble = (index: number, seconds: number, speed: number): number => Math.sin(index * 12.9898 + seconds * speed)

// crea la arena repartida por todo el lienzo, quieta y con un retraso de arranque distinto por punto
export const createField = (count: number, canvasWidth: number, canvasHeight: number, rand: () => number = Math.random): ScreensaverField => {
  const field: ScreensaverField = {
    count,
    x: new Float32Array(count),
    y: new Float32Array(count),
    vx: new Float32Array(count),
    vy: new Float32Array(count),
    delay: new Float32Array(count),
    z: new Float32Array(count),
  }
  for (let i = 0; i < count; i += 1) {
    field.x[i] = rand() * canvasWidth
    field.y[i] = rand() * canvasHeight
    field.delay[i] = rand()
    field.z[i] = rand() - 0.5
  }
  return field
}

// coloca cada punto exactamente en su lugar del logo (para quien prefiere menos movimiento)
export const snapToTargets = (field: ScreensaverField, targets: ScreensaverTargets, layout: ScreensaverLayout): void => {
  for (let i = 0; i < field.count; i += 1) {
    field.x[i] = layout.left + targets.nx[i] * layout.width
    field.y[i] = layout.top + targets.ny[i] * layout.height
    field.vx[i] = 0
    field.vy[i] = 0
  }
}

// avanza la arena un fotograma: dt en segundos, elapsedMs desde que apareció el protector, pointer = dónde está el cursor (o null)
export const stepField = (
  field: ScreensaverField,
  targets: ScreensaverTargets,
  layout: ScreensaverLayout,
  phase: ScreensaverPhase,
  dt: number,
  elapsedMs: number,
  pointer: ScreensaverPointer = null,
): void => {
  const { SPRING, DAMPING, MAX_DT, HOLD_TREMOR, STAGGER } = SCREENSAVER_PHYSICS
  const { RADIUS, FOLLOW, SCATTER, MAX_SPEED } = SCREENSAVER_POINTER
  const speed = pointer ? Math.min(MAX_SPEED, Math.hypot(pointer.vx, pointer.vy)) : 0
  const step = Math.min(dt, MAX_DT)
  const seconds = elapsedMs / 1000
  const drag = Math.exp(-DAMPING * step)

  for (let i = 0; i < field.count; i += 1) {
    let tx = layout.left + targets.nx[i] * layout.width
    let ty = layout.top + targets.ny[i] * layout.height

    if (phase.name === 'hold') {
      tx += wobble(i, seconds, 3.1) * HOLD_TREMOR
      ty += wobble(i + 7, seconds, 2.7) * HOLD_TREMOR
    }
    // al juntarse, cada punto arranca en su momento: la arena se asienta de a poco y no de golpe
    const ready = phase.name === 'gather' ? Math.max(0, Math.min(1, (phase.progress - field.delay[i] * STAGGER) / (1 - STAGGER))) : 1
    field.vx[i] += (tx - field.x[i]) * SPRING * ready * step
    field.vy[i] += (ty - field.y[i]) * SPRING * ready * step

    // el cursor remueve la arena cercana: la arrastra en su dirección y la dispersa un poco, más fuerte cuanto más cerca; si está quieto (velocidad 0) no hace nada
    if (pointer && speed > 0) {
      const dx = field.x[i] - pointer.x
      const dy = field.y[i] - pointer.y
      const distance = Math.hypot(dx, dy)
      if (distance < RADIUS) {
        const falloff = (1 - distance / RADIUS) ** 2
        // ojo: justo debajo del cursor no hay dirección clara hacia afuera, así que se elige una distinta por punto
        const angle = distance > 0.001 ? Math.atan2(dy, dx) : i
        field.vx[i] += (pointer.vx * FOLLOW + Math.cos(angle) * speed * SCATTER) * falloff * step
        field.vy[i] += (pointer.vy * FOLLOW + Math.sin(angle) * speed * SCATTER) * falloff * step
      }
    }

    field.vx[i] *= drag
    field.vy[i] *= drag
    field.x[i] += field.vx[i] * step
    field.y[i] += field.vy[i] * step
  }
}
