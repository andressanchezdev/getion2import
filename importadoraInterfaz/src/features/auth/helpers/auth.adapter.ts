// auth.adapter · convierte la respuesta de la API (actor + permisos) al usuario y los tokens que usa la app
// conecta con: auth.service (lo aplica al login y a la renovación); no lo importa nadie más
// ojo: es el único lugar que conoce los nombres del backend en la sesión
import type { AuthActorDto, AuthApiResponse, AuthPermissionDto } from '../types/auth.api.types'
import type { AuthResponse, AuthUser } from '../types/auth.types'

// el actor de la API pasa a ser AuthUser; lo que la API no trae queda vacío (el superadmin no tiene compañía: companyId 0)
export const toAuthUser = (api: { actor: AuthActorDto; permissions?: AuthPermissionDto[] }): AuthUser => {
  const actor = api.actor
  return {
    userId: actor.id,
    companyId: actor.companyId ?? 0,
    warehouseId: actor.warehouseId,
    name: actor.firstName,
    lastName: actor.lastName,
    email: actor.email,
    identification: actor.document ?? '',
    photo: actor.photoUrl ?? '',
    userType: actor.actorType,
    companyInformation: actor.companyName ? { businessName: actor.companyName } : undefined,
    permissions: api.permissions?.map((permission) => permission.key || `${permission.module}:${permission.action}`),
  }
}

// tokens + usuario de la app a partir de la respuesta de POST /auth/login o POST /auth/refresh
export const toAuthResponse = (api: AuthApiResponse): AuthResponse => ({
  access_token: api.access_token,
  refresh_token: api.refresh_token,
  user: toAuthUser(api),
})
