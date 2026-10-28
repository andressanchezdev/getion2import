// useAsyncValidation · hook de validación asíncrona en tiempo real (debounce 500ms)
// conecta con: apiClient, API_CONFIG (check-email, validate-document) y formularios
import { useState, useRef, useCallback } from 'react'
import { apiClient, API_CONFIG } from '@/api'
import { VALIDATORS } from '@/global/helpers/validation.helpers'

export const useAsyncValidation = () => {
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [isCheckingDoc, setIsCheckingDoc] = useState(false)
  const [emailAsyncError, setEmailAsyncError] = useState<string | null>(null)
  const [docAsyncError, setDocAsyncError] = useState<string | null>(null)

  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const docTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const validateEmailDebounced = useCallback((email: string, companyId: number) => {
    if (emailTimer.current) clearTimeout(emailTimer.current)
    setEmailAsyncError(null)

    if (!email || !VALIDATORS.isValidEmail(email)) return

    emailTimer.current = setTimeout(async () => {
      try {
        setIsCheckingEmail(true)
        const { data } = await apiClient.post<any>(
          API_CONFIG.ENDPOINTS.CUSTOMERS.CHECK_EMAIL,
          { companyId, email }
        )
        if (data && (data.exists === true || data.data?.exists === true || data.success === false)) {
          setEmailAsyncError('Este correo ya se encuentra registrado para esta empresa.')
        } else {
          setEmailAsyncError(null)
        }
      } catch (err: any) {
        if (err.response?.status === 409 || err.response?.data?.exists) {
          setEmailAsyncError('Este correo ya se encuentra registrado para esta empresa.')
        }
      } finally {
        setIsCheckingEmail(false)
      }
    }, 500)
  }, [])

  const validateDocumentDebounced = useCallback((documentNumber: string, documentType = 'CC') => {
    if (docTimer.current) clearTimeout(docTimer.current)
    setDocAsyncError(null)

    if (!documentNumber || documentNumber.length < 6) return

    docTimer.current = setTimeout(async () => {
      try {
        setIsCheckingDoc(true)
        const { data } = await apiClient.post<any>(
          API_CONFIG.ENDPOINTS.USERS.VALIDATE_DOCUMENT,
          { documentType, documentNumber }
        )
        if (data && (data.exists === true || data.data?.exists === true || data.success === false)) {
          setDocAsyncError('El documento de identidad ya se encuentra registrado en el sistema.')
        } else {
          setDocAsyncError(null)
        }
      } catch (err: any) {
        if (err.response?.status === 409 || err.response?.data?.exists) {
          setDocAsyncError('El documento de identidad ya se encuentra registrado en el sistema.')
        }
      } finally {
        setIsCheckingDoc(false)
      }
    }, 500)
  }, [])

  return {
    isCheckingEmail,
    isCheckingDoc,
    emailAsyncError,
    docAsyncError,
    validateEmailDebounced,
    validateDocumentDebounced,
    resetAsyncErrors: () => {
      setEmailAsyncError(null)
      setDocAsyncError(null)
    },
  }
}

export default useAsyncValidation
