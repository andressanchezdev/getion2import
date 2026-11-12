// realtime.ticket · pide un ticket de un solo uso a POST /realtime/ticket para abrir el websocket
// conecta con: api/client, api/config (ENDPOINTS.REALTIME.TICKET) y realtime.service
import { apiClient, API_CONFIG } from '@/api'
import type { APIResponse } from '@/api/types/api.types'
import type { RealtimeTicketResponse } from '../types/realtime.types'

export const requestTicket = async (): Promise<RealtimeTicketResponse> => {
  const response = await apiClient.post<APIResponse<RealtimeTicketResponse>>(
    API_CONFIG.ENDPOINTS.REALTIME.TICKET
  )
  const data = response.data?.data
  if (!data?.ticket) {
    throw new Error('El servidor no devolvió un ticket de tiempo real válido.')
  }
  return {
    ticket: data.ticket,
    wsUrl: data.wsUrl || API_CONFIG.WS_URL,
    expiresAt: data.expiresAt,
  }
}

