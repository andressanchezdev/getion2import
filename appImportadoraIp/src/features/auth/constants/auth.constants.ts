// auth.constants · textos del login (lo que ve el cliente, en español)
// conecta con: los componentes del login y useLoginForm (mensajes)
export const LOGIN_TEXTS = {
  brand: 'Online',
  welcome: 'Bienvenido',
  subtitle: 'Gracias por volver, por favor inicia sesión en tu cuenta',
  emailPlaceholder: 'Correo Electrónico',
  passwordPlaceholder: 'Contraseña',
  remember: 'Recordarme',
  forgot: '¿Has olvidado tu contraseña?',
  loginButton: 'Iniciar sesión',
  loginButtonLoading: 'Ingresando…',
  registerButton: 'Registrarse',
} as const

// mensajes de las alertas flotantes (sonner)
export const LOGIN_MESSAGES = {
  incompleteTitle: 'Datos incompletos',
  incompleteDescription: 'Por favor ingresa tu correo y tu contraseña.',
  failedTitle: 'No se pudo iniciar sesión',
  invalidCredentials: 'Correo o contraseña incorrectos.',
  unknownError: 'No fue posible iniciar sesión. Intenta de nuevo.',
  successTitle: 'Sesión iniciada',
  expiredTitle: 'Tu sesión expiró',
  expiredDescription: 'Ingresa de nuevo para continuar.',
  inactiveTitle: 'Sesión cerrada por inactividad',
  inactiveDescription: 'Pasó 1 hora sin actividad. Ingresa de nuevo para continuar.',
  logoutTitle: 'Sesión cerrada',
  remoteLogoutTitle: 'Sesión cerrada en otra pestaña',
  warningTitle: 'Tu sesión está por cerrarse',
  warningDescription: 'Mueve el mouse o toca una tecla para seguir conectado.',
} as const
