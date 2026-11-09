// useReasonPrompt.ts · pide un motivo (o nota) en el panel derecho y devuelve lo escrito, o null si se cancela
// conecta con: ReasonPrompt y las pantallas que lo usan, navigation (openDrawerForm) y reasonRequests; el formulario es ReasonFormPanel
import { useCallback } from 'react'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { openDrawerForm } from '@/features/navigation'
import { createReasonRequest } from '../helpers/reasonRequests'
import type { ReasonFormPayload, ReasonPromptOptions } from '../types/reasonPrompt.types'

export const useReasonPrompt = () => {
  const dispatch = useAppDispatch()

  return useCallback(
    (options: ReasonPromptOptions) =>
      new Promise<string | null>((resolve) => {
        const requestId = createReasonRequest(resolve)
        const payload: ReasonFormPayload = { ...options, requestId }
        dispatch(openDrawerForm({ kind: 'reasonForm', payload }))
      }),
    [dispatch]
  )
}
