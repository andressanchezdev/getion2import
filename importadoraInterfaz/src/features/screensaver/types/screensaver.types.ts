// screensaver.types · formas de datos del protector de pantalla (puntos objetivo y estado de la arena)
// conecta con: screensaver.sampling (crea los objetivos), screensaver.physics (crea y mueve la arena), useParticleAnimation (los usa)
export type ScreensaverPhaseName = 'gather' | 'hold'

export interface ScreensaverPhase {
  name: ScreensaverPhaseName
  progress: number // avance dentro de la fase, de 0 a 1
}

// lugares del logo donde debe terminar cada punto
export interface ScreensaverTargets {
  count: number
  nx: Float32Array // posición horizontal dentro del recuadro de la tinta, de 0 a 1
  ny: Float32Array // posición vertical dentro del recuadro de la tinta, de 0 a 1
  color: Uint32Array // color de cada punto, empacado como ABGR
  aspect: number // ancho / alto del recuadro de la tinta
}

// estado de la arena: un valor por punto
export interface ScreensaverField {
  count: number
  x: Float32Array
  y: Float32Array
  vx: Float32Array
  vy: Float32Array
  delay: Float32Array // retraso de arranque de cada punto, de 0 a 1
  z: Float32Array // profundidad de cada punto, de -0.5 a 0.5 (se multiplica por el grosor al girar)
}

// dónde y de qué tamaño se dibuja el logo dentro del lienzo
export interface ScreensaverLayout {
  left: number
  top: number
  width: number
  height: number
}

// cursor en coordenadas del lienzo: posición y velocidad en píxeles por segundo (null = el cursor no está sobre la pantalla)
export type ScreensaverPointer = { x: number; y: number; vx: number; vy: number } | null
