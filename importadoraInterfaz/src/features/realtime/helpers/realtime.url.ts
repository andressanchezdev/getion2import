// realtime.url · arma la URL del websocket con el token de la sesión
// conecta con: realtime.thunks (al iniciar la conexión)
// ojo: PROVISIONAL. Se envía el token como parámetro ?token=; si el servidor autentica de otra forma, solo se cambia aquí
export const buildSocketUrl = (baseUrl: string, token: string): string => {
  const url = new URL(baseUrl)
  url.searchParams.set('token', token)
  return url.toString()
}
