# GestionImportadora
# GestionImportadora
ciclo de sesión (inactividad, renovación, cierre real y confirmación)

No apliqué nada. Este plan está escrito para que Antigravity lo ejecute sin más contexto.

0. Reglas que Antigravity debe respetar
No usar git: nada de commits, ramas ni stash. El respaldo lo hace el usuario.
No crear carpetas nuevas en la raíz de src. Las subcarpetas nuevas van solo dentro de global/ o de features/auth/.
No tocar global2/ ni features2/.
No borrar código comentado.
El código va en inglés. Los comentarios y los textos al cliente van en español.
Cada archivo lleva una cabecera de 2 líneas: // nombre · qué hace y // conecta con: ….
Cada .tsx lleva su .css al lado, con el mismo nombre y usando solo tokens de src/styles/tokens.css.
Cada archivo debe tener menos de 150 líneas y una sola responsabilidad.
Una carpeta no debe pasar de unos 8 archivos. Si pasa, se agrupa en subcarpetas por función.
Capas: app → features → global → api. Dentro de una feature: types → constants → helpers → services/selectors → slices → thunks → hooks → components → screens. Entre features se importa solo por index.ts. features y global no importan código de ejecución desde app/.
Nunca probar con credenciales reales. Usar red simulada, parcheando XMLHttpRequest y WebSocket en el navegador.
1. Lo que dice el backend
POST /auth/refresh recibe { "refresh_token": "..." } (modelo RefreshTokenRequest). Devuelve { success, data } con la forma de LoginResponse: access_token, refresh_token y user.
POST /auth/logout necesita el header Authorization: Bearer. No lleva body y responde 204. Revoca todos los refresh tokens del usuario.
El Swagger no documenta cuánto duran los tokens. Por eso el código no debe fijar una duración. Debe leer exp del payload del JWT.
2. Pasos en orden
Paso 1 · Configuración del API
Archivo: src/api/config.ts.
Cambio: en ENDPOINTS.AUTH añadir LOGOUT: '/auth/logout'.
Paso 2 · Almacenamiento de sesión
Archivo: src/global/helpers/session.storage.ts.
Nueva función: updateTokens(accessToken: string, refreshToken: string | null): void.
Debe escribir en el mismo almacén que ya guarda la sesión: localStorage si access_token está ahí, si no sessionStorage.
Así se respeta la opción “recordarme” y nunca se mueve la sesión de un almacén a otro.
Todo va dentro del safe (try/catch) que ya existe.
Opcional: getSessionStorageKind(): 'local' | 'session' | null, si ayuda a la función anterior.
Paso 3 · Constantes
Archivo nuevo: src/features/auth/constants/auth.session.constants.ts.
export const SESSION_TIMING = {
  INACTIVITY_LIMIT_MS: 3 * 60 * 1000,  // 3 minutos sin actividad
  WARNING_BEFORE_MS: 30 * 1000,        // aviso opcional antes de cerrar
  REFRESH_MARGIN_MS: 60 * 1000,        // renovar 60 s antes de que venza el token
  ACTIVITY_THROTTLE_MS: 1000,          // no registrar actividad más de 1 vez por segundo
  TICK_MS: 5000,                       // revisión periódica
} as const
export const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const
Archivo existente: auth.constants.ts, en LOGIN_MESSAGES. Añadir los textos al cliente:
inactiveTitle: 'Sesión cerrada por inactividad'
inactiveDescription: 'Pasaron 3 minutos sin actividad. Ingresa de nuevo para continuar.'
logoutTitle: 'Sesión cerrada'
warningTitle: 'Tu sesión está por cerrarse'
warningDescription: 'Mueve el mouse o toca una tecla para seguir conectado.'
Nuevo objeto LOGOUT_CONFIRM_TEXTS:
title: '¿Cerrar sesión?'
description: 'Se cerrará tu sesión en este equipo y se revocará el acceso.'
confirm: 'Cerrar sesión'
cancel: 'Cancelar'
Paso 4 · Helper del token
Archivo nuevo: src/features/auth/helpers/auth.token.ts.
Funciones:
decodeJwtExp(token: string): number | null. Parte el token en ., decodifica el payload en base64url (cambia -/_ y añade el relleno =), hace JSON.parse y devuelve exp * 1000 en milisegundos. Si algo falla devuelve null; nunca debe lanzar error.
msUntilExpiry(token: string, now = Date.now()): number | null.
shouldRefresh(token: string, marginMs: number, now?: number): boolean. Es true cuando falta marginMs o menos para el vencimiento.
Si exp es null: no se renueva por tiempo. Solo funciona la inactividad y el 401.
Paso 5 · Tipos
Archivo: src/features/auth/types/auth.types.ts.
Añadir: type LogoutReason = 'manual' | 'inactivity' | 'expired'.
Para refresh: reutilizar el tipo de respuesta del login (AuthResponse).
Paso 6 · Servicios
Archivo: src/features/auth/services/auth.service.ts.
Añadir:
export const refreshRequest = async (refreshToken: string): Promise<AuthResponse> => {
  const { data } = await apiClient.post<APIResponse<AuthResponse>>(
    API_CONFIG.ENDPOINTS.AUTH.REFRESH, { refresh_token: refreshToken })
  return data.data
}
export const logoutRequest = async (): Promise<void> => {
  await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT)   // 204, sin body
}
Paso 7 · Cliente HTTP
Archivo: src/api/client.ts.
En el interceptor de respuesta, el handler de 401 hoy se salta solo /auth/login. Debe saltarse también /auth/refresh y /auth/logout. Si no, una falla al renovar o al cerrar provoca un bucle de cierres de sesión.
Opcional, solo si no complica: ante un 401 en una ruta normal, intentar una renovación y reintentar la petición una vez. Para eso:
Guardar una única promesa de refresh en vuelo, para que las llamadas concurrentes esperen la misma.
Marcar la petición reintentada con una bandera para que no entre en bucle.
Si el refresh falla, llamar al unauthorizedHandler.
Capas: api no puede importar de features. El refresh real debe inyectarse con algo como setRefreshHandler(fn), igual que ya se hace con setUnauthorizedHandler.
Paso 8 · Thunks
Archivo: src/features/auth/thunks/auth.thunks.ts (puede partirse en auth.thunks.ts y auth.session.thunks.ts si pasa de 150 líneas).
logoutThunk pasa a recibir LogoutReason (por defecto 'manual'). El orden importa:
Si hay token, llamar logoutRequest() dentro de un try/catch. Si falla (red, 401, lo que sea), se ignora.
Siempre ejecutar clearAuthSession().
Según la razón, mostrar el toast: inactivity usa inactiveTitle y inactiveDescription, expired usa expiredTitle, manual usa logoutTitle.
Mostrar el toast dentro del thunk, o en el hook que lo despacha. Solo en un lugar, para que no salga duplicado.
Orden clave: el logout contra el servidor debe ir antes de borrar los tokens locales. Con el token ya borrado, la petición saldría sin Authorization y el servidor devolvería 401 sin revocar nada.
refreshSessionThunk:
Leer readSession().
Si no hay refreshToken, rechazar.
Llamar refreshRequest.
Guardar el par nuevo con updateTokens(access, refresh) y actualizar el usuario si viene.
Si falla, despachar logoutThunk('expired').
El servidor puede rotar el refresh token. Por eso siempre hay que guardar el que llega en la respuesta, no reutilizar el anterior.
Para que dos pestañas no se pisen: leer el refresh token justo antes de llamar, y no mantener copias en memoria.
Paso 9 · Slice y store
auth.slice.ts: logoutThunk.fulfilled se mantiene y el estado vuelve a anonymous. Añadir logoutThunk.rejected con el mismo efecto, por seguridad.
store.ts: el setUnauthorizedHandler hoy despacha logoutThunk() y muestra su propio toast. Cambiarlo a store.dispatch(logoutThunk('expired')) y quitar el toast de ahí, para que no salga dos veces.
Paso 10 · Hook de actividad
Archivo nuevo: src/features/auth/hooks/useSessionActivity.ts. Si pasa de 150 líneas, partirlo en dos hooks: uno para el seguimiento de actividad y otro para la renovación.
Comportamiento:
Una referencia lastActivityRef = Date.now(). Los eventos de ACTIVITY_EVENTS en window la actualizan (con un throttle de 1 s). Los listeners llevan { passive: true } y se quitan en el cleanup.
Un setInterval cada TICK_MS, con el siguiente flujo:
idle = now - lastActivity.
Si idle >= INACTIVITY_LIMIT_MS, despachar logoutThunk('inactivity') y parar.
Si idle >= LIMIT - WARNING_BEFORE_MS, mostrar una sola vez el aviso (con un toastId fijo). Cualquier actividad lo descarta.
Si hubo actividad reciente (idle < LIMIT) y shouldRefresh(accessToken, REFRESH_MARGIN_MS), despachar refreshSessionThunk(). Una bandera refreshingRef evita lanzar dos a la vez.
Con document.visibilitychange, al volver a la pestaña se evalúa de inmediato, porque los timers se frenan en segundo plano. Si ya pasaron más de 3 minutos, se cierra la sesión.
Condición de renovación: la renovación depende de que haya actividad dentro de la ventana de 3 minutos. Sin actividad no se renueva, y la sesión se cierra.
Sincronización entre pestañas (recomendado): escuchar el evento storage sobre access_token. Si desaparece en otra pestaña, hacer logout local. Esto solo cubre pestañas con localStorage (sesión recordada).
Montaje: una sola vez en src/app/layout/ErpLayout.tsx, junto a useRealtime(). Como ErpLayout solo existe con sesión activa, el hook no corre en el login.
Export: añadir el hook a features/auth/index.ts.
Paso 11 · Confirmación de cierre
Archivos nuevos: src/global/components/UI/molecules/ConfirmDialog.tsx y ConfirmDialog.css. Si molecules pasa de 8 archivos, usar una subcarpeta confirm/.
Props: open, title, description, confirmLabel, cancelLabel, onConfirm, onCancel, y loading? (opcional).
Comportamiento:
role="alertdialog", aria-modal="true", aria-labelledby y aria-describedby.
Esc cancela (usar useEscapeKey de global/hooks).
Clic en el fondo cancela.
El foco inicial va al botón “Cancelar”. Es la opción segura, para que un Enter accidental no cierre la sesión.
El foco queda atrapado dentro del diálogo y, al cerrar, vuelve al botón que lo abrió.
Mientras está abierto, el contenido de atrás no debe recibir foco.
CSS: solo tokens (colores, radios, sombras, espaciado, movimiento). Una animación corta de entrada que respete prefers-reduced-motion. En móvil los botones pueden apilarse.
Cableado: src/app/componentApp/sideMenu/footer/SideMenuUser.tsx.
El botón de cerrar sesión deja de despachar directo. Abre el diálogo con un useState.
Al confirmar: dispatch(logoutThunk('manual')).
Es una excepción permitida, porque son confirmaciones de acciones, y no hace falta crear otro componente de app.
Mientras corre el logout: deshabilitar los botones (loading). El logout contra el servidor puede tardar hasta 15 s por el timeout de axios, y no debe poder pulsarse dos veces.
Paso 12 · Realtime
El socket se abre con el token en la URL (?token=). Tras una renovación, el socket abierto sigue con el token viejo.
Decisión pendiente: si el servidor valida el token de nuevo al reconectar, hay que reabrir el socket con el token nuevo después de cada refresh. Si no, basta con que la siguiente reconexión lea el token actual de readSession().
Al cerrar sesión ya se detiene solo, porque isAuthenticated pasa a falso. Verificar que no quede ningún socket abierto.
Paso 13 · Documentación
Actualizar docs/CONVENTIONS.md con una sección corta sobre el ciclo de sesión.
Regenerar docs/ESTRUCTURA.md con el script de generación, que lee las cabeceras de cada archivo.
Revisar que .env.example no necesite variables nuevas. Los tiempos van en constantes, no en variables de entorno.
3. Casos borde
Token sin exp o ilegible: no se renueva por tiempo. Solo aplican inactividad y 401.
Refresh falla (401 o red): logout con razón expired. Un error de red puntual no debería cerrar la sesión por sí solo; reintentar una vez antes de cerrar.
Varios refresh a la vez: una sola promesa en vuelo más la bandera refreshingRef.
Logout con el servidor caído: igual se limpia lo local y se informa. Solo hay que avisar que el servidor no pudo confirmar la revocación si falló.
“Recordarme” desmarcado: los tokens viven en sessionStorage. updateTokens debe escribir ahí, no en localStorage.
Computador dormido o pestaña en segundo plano: al volver se revisa con visibilitychange y con la comparación de timestamps, no con timers acumulados.
Dos pestañas: el logout revoca todos los refresh tokens del usuario, así que la otra pestaña se enterará con su siguiente 401 o por el evento storage.
Diálogo abierto durante la inactividad: el cierre por inactividad lo cierra y gana sobre la confirmación.
Ningún toast duplicado: usar un toastId por tipo.
4. Pruebas (red simulada, sin credenciales reales)

Para no esperar 3 minutos reales, probar con una constante de desarrollo reducida (por ejemplo 10 s) y devolverla a 3 * 60 * 1000 antes de terminar.

Inactividad: sesión simulada y sin mover el mouse. A los 3 minutos se cierra y se ve el toast de inactividad. Con actividad cada 2 minutos no se cierra.
Aviso: a los 2:30 sin actividad sale el aviso. Al mover el mouse desaparece.
Renovación: un JWT falso con exp a 90 s. Con actividad, a los ~30 s (exp menos 60 s) se hace POST /auth/refresh con {refresh_token}, se guardan los dos tokens nuevos en el mismo almacén y no hay toast. Sin actividad no se renueva y se cierra.
Logout manual: el botón abre la confirmación. “Cancelar” y Esc no hacen nada. “Cerrar sesión” hace POST /auth/logout con Authorization: Bearer, luego limpia el almacenamiento y vuelve al login.
Orden del logout: confirmar en la red simulada que la petición salió con el token puesto.
Logout con servidor caído: simular error 500 o red caída. La sesión local igual se cierra.
Sin bucles: un 401 en /auth/refresh o /auth/logout no vuelve a disparar el handler.
Foco y accesibilidad del diálogo: Tab no sale del diálogo, el foco inicial está en “Cancelar”, Esc cierra y el foco vuelve al botón.
Comprobaciones finales: npx tsc -b, npm run lint, npm run build, sin errores en consola, y la verificación de capas de siempre (0 violaciones, 0 ciclos).
5. Criterios de aceptación
La sesión se cierra tras 3 minutos sin actividad y solo en ese caso.
Con actividad continua, los tokens se renuevan solos sin que el usuario lo note.
Al cerrar sesión se llama POST /auth/logout y se borran todos los datos locales, incluso si el servidor falla.
Toda salida manual pasa por la confirmación.
No hay carpetas nuevas en la raíz de src, ni archivos de 150 líneas o más, ni código comentado borrado, y global2/ y features2/ siguen intactos.
Los textos al cliente están en español y los identificadores en inglés.
6. Decisiones que quedan abiertas
Duración real del token: hoy no la conocemos. El usuario puede confirmarla decodificando iat y exp en la consola. Si el access token dura menos de 3 minutos, la renovación será frecuente y conviene reducir REFRESH_MARGIN_MS.
Rotación del refresh token: el código ya guarda el que llega, así que funciona en ambos casos.
Aviso previo (30 s): lo incluí como opcional. Si no lo quieres, se quita WARNING_BEFORE_MS y su toast.
Eventos que cuentan como actividad: propuse mouse, teclado, scroll y toque. Se pueden ajustar en ACTIVITY_EVENTS.
Reintento automático tras un 401 normal: es opcional (Paso 7). Hoy solo se consumen login y health, así que no se nota hasta que haya más endpoints.# getion2import
