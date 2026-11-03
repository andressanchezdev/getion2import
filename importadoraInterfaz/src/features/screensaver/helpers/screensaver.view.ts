// screensaver.view · giro de la arena en 3D (horizontal y vertical) y su proyección al lienzo; matemática pura para poder probarla
// conecta con: useParticleAnimation (gira cada punto al dibujar) y screensaver.constants (SCREENSAVER_VIEW)
// ojo: sin giro la proyección es exactamente la posición original (el logo se ve plano y nítido); la perspectiva solo aparece al girar

export interface ScreensaverView {
  yaw: number // giro alrededor del eje vertical (arrastrar a los lados), en radianes
  pitch: number // giro alrededor del eje horizontal (arrastrar arriba y abajo), en radianes
}

// gira un punto (relativo al centro del logo, con su profundidad z) y devuelve dónde cae en el lienzo; focal = distancia de la cámara
export const projectPoint = (rx: number, ry: number, z: number, view: ScreensaverView, focal: number): [number, number] => {
  const cosY = Math.cos(view.yaw)
  const sinY = Math.sin(view.yaw)
  const cosP = Math.cos(view.pitch)
  const sinP = Math.sin(view.pitch)
  const x1 = rx * cosY + z * sinY
  const z1 = -rx * sinY + z * cosY
  const y2 = ry * cosP - z1 * sinP
  const z2 = ry * sinP + z1 * cosP
  // ojo: se compara contra la profundidad original para que, sin giro, la escala sea exactamente 1
  const scale = focal / Math.max(focal * 0.2, focal - (z2 - z))
  return [x1 * scale, y2 * scale]
}

// suma lo arrastrado (en píxeles) al giro actual
export const rotateView = (view: ScreensaverView, dx: number, dy: number, speed: number): ScreensaverView => ({
  yaw: view.yaw + dx * speed,
  pitch: view.pitch + dy * speed,
})
