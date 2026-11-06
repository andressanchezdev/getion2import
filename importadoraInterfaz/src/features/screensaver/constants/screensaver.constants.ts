// screensaver.constants · tiempos, tamaños y textos del protector de pantalla (arena que forma el logo de Importadora Premium)
// conecta con: useIdle (espera), screensaver.sampling y screensaver.physics (puntos y movimiento), IdleScreensaver (textos)
// El intervalo es único para todas las compañías y se define desde el código.
export const SCREENSAVER_TIMING = {
  IDLE_MS: 5 * 60 * 1000, // sin actividad durante este tiempo → aparece el protector
  CHECK_MS: 1000, // cada cuánto se revisa la inactividad (se compara con la hora, no se suman timers)
  WAKE_GRACE_MS: 600, // al aparecer ignora los clics y teclas este tiempo para que un toque suelto no lo cierre
} as const

// qué cuenta como actividad mientras la pantalla está despierta (reinicia la espera); con el protector activo solo importan el clic sostenido y soltarlo
export const SCREENSAVER_ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'mouseup', 'keydown', 'wheel', 'touchstart', 'touchend', 'click'] as const

// qué cierra el protector: SOLTAR el clic (o el dedo). Mantener el clic apretado no lo cierra: sirve para girar la imagen; el teclado no hace nada
export const SCREENSAVER_WAKE_EVENTS = ['mouseup', 'touchend'] as const

// después de despertar se tragan los clics que lleguen en este tiempo, para que soltar el clic no active el botón que queda debajo
export const SCREENSAVER_CLICK_SWALLOW_MS = 400

// cómo se convierte la imagen en puntos
export const SCREENSAVER_SAMPLING = {
  SAMPLE_WIDTH: 1000, // ancho al que se reduce la imagen para leer sus píxeles (si es menor, la letra pequeña de abajo se desvanece)
  LUMA_MIN: 110, // brillo mínimo (0–255) para que un píxel cuente como tinta; el fondo oscuro (~30) queda fuera y los trazos finos del texto pequeño entran
  MAX_POINTS: 60000, // tope de puntos para que la animación fluya en equipos modestos
} as const

// movimiento: la arena se junta en el logo y ahí se queda (con un leve temblor) hasta que el usuario suelta un clic
export const SCREENSAVER_CYCLE = {
  GATHER_MS: 3600,
} as const

// fuerzas de la arena (unidades por segundo)
export const SCREENSAVER_PHYSICS = {
  SPRING: 14, // qué tan fuerte jala cada punto hacia su lugar en el logo
  DAMPING: 4, // qué tan rápido se frena el movimiento
  MAX_DT: 0.05, // tope de segundos por fotograma (si la pestaña se durmió no salta de golpe)
  HOLD_TREMOR: 0.7, // píxeles de temblor mientras el logo está formado
  STAGGER: 0.55, // fracción de la fase de unión en la que se reparte el arranque de cada punto
} as const

// reacción al cursor: el mouse remueve la arena al pasar (la arrastra en su dirección y la dispersa un poco) y deja de hacer efecto en cuanto se detiene
// ojo: depende de la velocidad del cursor y no de su posición; así un mouse quieto no deja un hueco redondo en el logo
export const SCREENSAVER_POINTER = {
  RADIUS: 90, // distancia (en píxeles del lienzo) a la que el cursor alcanza a mover la arena
  FOLLOW: 14, // cuánto arrastra la arena en la dirección del movimiento (más alto = la arrastra más)
  SCATTER: 5, // cuánto la dispersa hacia afuera mientras el cursor se mueve (más alto = abre más espacio)
  VELOCITY_DECAY: 9, // qué tan rápido se apaga el efecto al detener el mouse (por segundo)
  MAX_SPEED: 2500, // tope de velocidad del cursor que se toma en cuenta (píxeles del lienzo por segundo)
} as const

// giro de 360° con el clic sostenido: la arena tiene algo de profundidad y se gira en el eje horizontal y vertical según cuánto se arrastra
export const SCREENSAVER_VIEW = {
  ROTATE_SPEED: 0.008, // radianes por píxel arrastrado (unos 800 px dan media vuelta)
  DEPTH_RATIO: 0.22, // grosor de la nube de puntos, como fracción del ancho del logo
  FOCAL_RATIO: 1.8, // distancia de la cámara, como fracción del ancho del logo (más alto = menos perspectiva)
} as const

// dibujo
export const SCREENSAVER_RENDER = {
  MAX_CANVAS_WIDTH: 1600, // ancho interno máximo del lienzo (se estira con CSS al tamaño de la ventana)
  DOT_SIZE: 2, // lado de cada punto en píxeles del lienzo
  LOGO_MAX_WIDTH: 0.7, // fracción del ancho de la ventana que puede ocupar el logo
  LOGO_MAX_HEIGHT: 0.84, // fracción del alto de la ventana que puede ocupar el logo
  BACKGROUND: 0xff231d1c, // color de fondo del lienzo, ABGR (rgb 28, 29, 35: el fondo oscuro de la imagen)
} as const

export const SCREENSAVER_LABELS = {
  region: 'Protector de pantalla',
  hint: 'Mantén el clic para girar la imagen · suelta para volver',
} as const
